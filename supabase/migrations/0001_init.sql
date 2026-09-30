-- =========================================================================
-- Salda — cost & income tracker. Shared-workspace schema on Supabase Postgres.
-- =========================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- profiles — one row per auth user, created automatically on signup.
-- ---------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  email text,
  created_at timestamptz not null default now()
);

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)), new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------
-- workspaces — a shared ledger (e.g. a household). base_currency and
-- monthly_budget are the workspace-wide defaults shown on Overview.
-- ---------------------------------------------------------------------
create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references profiles (id) on delete set null,
  base_currency text not null default 'BAM',
  monthly_budget numeric(12, 2),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- workspace_members / workspace_invites — same sharing model as before:
-- owner vs. member, email invites accepted automatically on login.
-- ---------------------------------------------------------------------
create table if not exists workspace_members (
  workspace_id uuid not null references workspaces (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  role text not null check (role in ('owner', 'member')) default 'member',
  joined_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index if not exists idx_workspace_members_user on workspace_members (user_id);

create table if not exists workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  email text not null,
  role text not null check (role in ('owner', 'member')) default 'member',
  invited_by uuid references profiles (id) on delete set null,
  status text not null check (status in ('pending', 'accepted', 'revoked')) default 'pending',
  created_at timestamptz not null default now(),
  unique (workspace_id, email)
);

create index if not exists idx_workspace_invites_email on workspace_invites (email);

-- ---------------------------------------------------------------------
-- categories — shared across the workspace, each with an optional
-- monthly budget (Settings → Categories & budgets).
-- ---------------------------------------------------------------------
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  name text not null,
  monthly_budget numeric(12, 2),
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (workspace_id, name)
);

create index if not exists idx_categories_workspace on categories (workspace_id);

-- ---------------------------------------------------------------------
-- transactions — unified cost/income entries. merchant_or_source holds
-- "Merchant" for a cost or "Employer/client" for income. category_id is
-- cost-only; income_kind is income-only; payment_method is cost-only.
-- Foreign-currency entries keep the original amount + the manually
-- entered rate alongside the converted base-currency amount.
-- ---------------------------------------------------------------------
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  type text not null check (type in ('cost', 'income')),
  occurred_on date not null default current_date,
  merchant_or_source text not null,
  category_id uuid references categories (id) on delete set null,
  income_kind text check (income_kind in ('salary', 'additional')),
  payment_method text check (payment_method in ('card', 'cash', 'transfer')),
  amount numeric(12, 2) not null check (amount > 0),
  fx_amount numeric(12, 2),
  fx_currency text,
  fx_rate numeric(14, 6),
  note text,
  is_recurring boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cost_fields_check check (
    type = 'income' or (income_kind is null)
  ),
  constraint income_fields_check check (
    type = 'cost' or (category_id is null and payment_method is null)
  )
);

create index if not exists idx_transactions_workspace_date on transactions (workspace_id, occurred_on desc);
create index if not exists idx_transactions_user on transactions (user_id);
create index if not exists idx_transactions_category on transactions (category_id);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_transactions_updated_at on transactions;
create trigger trg_transactions_updated_at
  before update on transactions
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- accept_pending_invites() — joins the current user to any workspace
-- with a pending invite matching their email. Called right after login.
-- ---------------------------------------------------------------------
create or replace function accept_pending_invites()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  my_email text;
begin
  select email into my_email from auth.users where id = auth.uid();
  if my_email is null then
    return;
  end if;

  insert into workspace_members (workspace_id, user_id, role)
  select wi.workspace_id, auth.uid(), wi.role
  from workspace_invites wi
  where wi.email = my_email
    and wi.status = 'pending'
  on conflict (workspace_id, user_id) do nothing;

  update workspace_invites
  set status = 'accepted'
  where email = my_email
    and status = 'pending';
end;
$$;

-- =========================================================================
-- Row Level Security
-- =========================================================================
alter table profiles enable row level security;
alter table workspaces enable row level security;
alter table workspace_members enable row level security;
alter table workspace_invites enable row level security;
alter table categories enable row level security;
alter table transactions enable row level security;

-- --- profiles ---------------------------------------------------------
create policy "profiles: self and workspace-mates can view"
  on profiles for select
  using (
    id = auth.uid()
    or id in (
      select wm2.user_id
      from workspace_members wm1
      join workspace_members wm2 on wm2.workspace_id = wm1.workspace_id
      where wm1.user_id = auth.uid()
    )
  );

create policy "profiles: self update"
  on profiles for update
  using (id = auth.uid());

-- --- workspaces ---------------------------------------------------------
create policy "workspaces: members can view"
  on workspaces for select
  using (id in (select workspace_id from workspace_members where user_id = auth.uid()));

create policy "workspaces: any authenticated user can create"
  on workspaces for insert
  with check (created_by = auth.uid());

create policy "workspaces: owner can update"
  on workspaces for update
  using (id in (select workspace_id from workspace_members where user_id = auth.uid() and role = 'owner'));

create policy "workspaces: owner can delete"
  on workspaces for delete
  using (id in (select workspace_id from workspace_members where user_id = auth.uid() and role = 'owner'));

-- --- workspace_members ---------------------------------------------------------
create policy "members: view own workspace roster"
  on workspace_members for select
  using (workspace_id in (select workspace_id from workspace_members wm where wm.user_id = auth.uid()));

create policy "members: creator becomes owner"
  on workspace_members for insert
  with check (
    user_id = auth.uid()
    and role = 'owner'
    and workspace_id in (select id from workspaces where created_by = auth.uid())
  );

create policy "members: accept own pending invite"
  on workspace_members for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from workspace_invites wi
      where wi.workspace_id = workspace_members.workspace_id
        and wi.email = (select email from auth.users where id = auth.uid())
        and wi.status = 'pending'
        and wi.role = workspace_members.role
    )
  );

create policy "members: owner can remove members"
  on workspace_members for delete
  using (
    workspace_id in (select workspace_id from workspace_members wm where wm.user_id = auth.uid() and wm.role = 'owner')
    and user_id <> auth.uid()
  );

create policy "members: owner can change roles"
  on workspace_members for update
  using (workspace_id in (select workspace_id from workspace_members wm where wm.user_id = auth.uid() and wm.role = 'owner'));

-- --- workspace_invites ---------------------------------------------------------
create policy "invites: owner can view workspace invites"
  on workspace_invites for select
  using (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid() and role = 'owner')
    or email = (select email from auth.users where id = auth.uid())
  );

create policy "invites: owner can create"
  on workspace_invites for insert
  with check (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid() and role = 'owner'));

create policy "invites: owner can revoke"
  on workspace_invites for update
  using (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid() and role = 'owner'));

create policy "invites: owner can delete"
  on workspace_invites for delete
  using (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid() and role = 'owner'));

-- --- categories ---------------------------------------------------------
-- Household-collaborative: any member can view and manage categories.
create policy "categories: members view"
  on categories for select
  using (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()));

create policy "categories: members insert"
  on categories for insert
  with check (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    and created_by = auth.uid()
  );

create policy "categories: members update"
  on categories for update
  using (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()));

create policy "categories: members delete"
  on categories for delete
  using (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()));

-- --- transactions ---------------------------------------------------------
create policy "transactions: members view all in workspace"
  on transactions for select
  using (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()));

create policy "transactions: members insert own"
  on transactions for insert
  with check (
    user_id = auth.uid()
    and workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
  );

create policy "transactions: author or owner can update"
  on transactions for update
  using (
    user_id = auth.uid()
    or workspace_id in (select workspace_id from workspace_members where user_id = auth.uid() and role = 'owner')
  );

create policy "transactions: author or owner can delete"
  on transactions for delete
  using (
    user_id = auth.uid()
    or workspace_id in (select workspace_id from workspace_members where user_id = auth.uid() and role = 'owner')
  );
