-- =========================================================================
-- 0002: fix Row Level Security bugs in 0001_init.sql
--   1. "infinite recursion detected in policy for relation workspace_members"
--      -> policies on workspace_members queried workspace_members itself.
--         Use SECURITY DEFINER helper functions (which bypass RLS) instead.
--   2. Creating a workspace failed because INSERT ... RETURNING must pass the
--      SELECT policy, and the creator isn't a member yet -> also allow the
--      creator (created_by) to see their workspace.
--   3. Policies read auth.users, which logged-in users can't query ->
--      use the email in the user's JWT instead.
-- Safe to run once on top of 0001. Re-running is also safe.
-- =========================================================================

create or replace function public.is_workspace_member(ws uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws and user_id = auth.uid()
  );
$$;

create or replace function public.is_workspace_owner(ws uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws and user_id = auth.uid() and role = 'owner'
  );
$$;

grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.is_workspace_owner(uuid) to authenticated;

-- --- workspace_members (the recursive ones) ------------------------------
drop policy if exists "members: view own workspace roster" on workspace_members;
create policy "members: view own workspace roster"
  on workspace_members for select
  using (user_id = auth.uid() or public.is_workspace_member(workspace_id));

drop policy if exists "members: owner can remove members" on workspace_members;
create policy "members: owner can remove members"
  on workspace_members for delete
  using (public.is_workspace_owner(workspace_id) and user_id <> auth.uid());

drop policy if exists "members: owner can change roles" on workspace_members;
create policy "members: owner can change roles"
  on workspace_members for update
  using (public.is_workspace_owner(workspace_id));

-- Accepting an invite: compare against the JWT email, not auth.users.
drop policy if exists "members: accept own pending invite" on workspace_members;
create policy "members: accept own pending invite"
  on workspace_members for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from workspace_invites wi
      where wi.workspace_id = workspace_members.workspace_id
        and lower(wi.email) = lower(auth.jwt() ->> 'email')
        and wi.status = 'pending'
        and wi.role = workspace_members.role
    )
  );

-- --- workspaces ---------------------------------------------------------
-- The creator must be able to read the row they just inserted (RETURNING),
-- before their membership row exists.
drop policy if exists "workspaces: members can view" on workspaces;
create policy "workspaces: members can view"
  on workspaces for select
  using (created_by = auth.uid() or public.is_workspace_member(id));

drop policy if exists "workspaces: owner can update" on workspaces;
create policy "workspaces: owner can update"
  on workspaces for update
  using (public.is_workspace_owner(id));

drop policy if exists "workspaces: owner can delete" on workspaces;
create policy "workspaces: owner can delete"
  on workspaces for delete
  using (public.is_workspace_owner(id));

-- --- workspace_invites --------------------------------------------------
drop policy if exists "invites: owner can view workspace invites" on workspace_invites;
create policy "invites: owner can view workspace invites"
  on workspace_invites for select
  using (
    public.is_workspace_owner(workspace_id)
    or lower(email) = lower(auth.jwt() ->> 'email')
  );

drop policy if exists "invites: owner can create" on workspace_invites;
create policy "invites: owner can create"
  on workspace_invites for insert
  with check (public.is_workspace_owner(workspace_id));

drop policy if exists "invites: owner can revoke" on workspace_invites;
create policy "invites: owner can revoke"
  on workspace_invites for update
  using (public.is_workspace_owner(workspace_id));

drop policy if exists "invites: owner can delete" on workspace_invites;
create policy "invites: owner can delete"
  on workspace_invites for delete
  using (public.is_workspace_owner(workspace_id));

-- --- categories / transactions ------------------------------------------
drop policy if exists "categories: members view" on categories;
create policy "categories: members view"
  on categories for select
  using (public.is_workspace_member(workspace_id));

drop policy if exists "categories: members insert" on categories;
create policy "categories: members insert"
  on categories for insert
  with check (public.is_workspace_member(workspace_id) and created_by = auth.uid());

drop policy if exists "categories: members update" on categories;
create policy "categories: members update"
  on categories for update
  using (public.is_workspace_member(workspace_id));

drop policy if exists "categories: members delete" on categories;
create policy "categories: members delete"
  on categories for delete
  using (public.is_workspace_member(workspace_id));

drop policy if exists "transactions: members view all in workspace" on transactions;
create policy "transactions: members view all in workspace"
  on transactions for select
  using (public.is_workspace_member(workspace_id));

drop policy if exists "transactions: members insert own" on transactions;
create policy "transactions: members insert own"
  on transactions for insert
  with check (user_id = auth.uid() and public.is_workspace_member(workspace_id));

drop policy if exists "transactions: author or owner can update" on transactions;
create policy "transactions: author or owner can update"
  on transactions for update
  using (user_id = auth.uid() or public.is_workspace_owner(workspace_id));

drop policy if exists "transactions: author or owner can delete" on transactions;
create policy "transactions: author or owner can delete"
  on transactions for delete
  using (user_id = auth.uid() or public.is_workspace_owner(workspace_id));
