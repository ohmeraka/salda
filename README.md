# Salda

A mobile-first, household cost & income tracker. Built from a high-fidelity
design handoff ("Broadsheet" design system, Arial + no-shading client
overrides) on **Next.js 16** (App Router) and **Supabase** (Postgres, Auth,
Row Level Security).

## Stack

- **Next.js 16** (App Router, Turbopack, Server Actions) + TypeScript
- **Supabase**: Postgres database, email/password Auth with OTP email
  confirmation, Row Level Security for all data access
- **Tailwind CSS v4** for layout utilities, plus a hand-ported design-token
  stylesheet (`src/app/globals.css`) for the Broadsheet component classes
  (`.btn`, `.card`, `.tag`, `.chip`, `.seg`, `.dialog`, …)
- No client-side chart library — the bar charts (Overview, Summary) are
  plain CSS, matching the design's own markup exactly

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in your Supabase project's values
npm run dev
```

### 1. Create a Supabase project

Create a project at [supabase.com](https://supabase.com), then copy its URL
and keys (Project Settings → API) into `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — server-only, used by
  `src/lib/supabase/admin.ts` for privileged operations. Never expose this
  to the browser.
- `EXCHANGE_RATE_API_KEY` — a free key from
  [exchangerate-api.com](https://app.exchangerate-api.com/dashboard),
  server-only, used to pre-fill the exchange rate on foreign-currency
  entries (see below). Already set in this copy's `.env.local`.

### 2. Run the database migration

In the Supabase dashboard's SQL Editor, run the contents of
`supabase/migrations/0001_init.sql` (or apply it with the Supabase CLI:
`supabase db push`). This creates every table, the `handle_new_user` /
`accept_pending_invites` functions, and all Row Level Security policies.

### 3. ⚠️ Required: switch the signup email template to a 6-digit code

Salda's "Confirm email" screen asks for a **6-digit code**, not a magic
link. Supabase's default "Confirm signup" template uses
`{{ .ConfirmationURL }}`, which won't work with this flow.

In the Supabase dashboard: **Authentication → Email Templates → Confirm
signup**, replace the template body so it displays `{{ .Token }}` instead
of (or alongside) `{{ .ConfirmationURL }}`, e.g.:

```html
<h2>Confirm your signup</h2>
<p>Enter this code to finish creating your Salda account:</p>
<h1>{{ .Token }}</h1>
```

Without this change, users will receive a link instead of a code and won't
be able to complete sign-up through the app's Confirm screen.

### 4. Run it

```bash
npm run dev
```

Visit `http://localhost:3000` — it redirects to `/welcome`.

## Scope decisions

This build follows the design handoff pixel-for-pixel, with a few
deliberate scope choices made for this phase:

- **Auth: email/password only.** The four OAuth provider buttons (Google,
  Apple, Microsoft, GitHub) are built and shown per the design, but
  disabled with a "Soon" tag — wire them up once provider credentials
  exist (Supabase Auth → Providers).
- **No receipt scanning yet.** The "Scan a receipt" option in the Add
  sheet is visible but disabled ("Soon"); only manual entry is wired.
  Re-enabling it means building Step B of the sheet (camera capture /
  upload → vision-model or OCR extraction → review form) — the design's
  own `README` in the handoff describes the intended flow in detail.
- **Live FX rate, still editable.** Picking a foreign currency on a
  transaction auto-fills the exchange rate (`1 USD = ? BAM`) from
  [ExchangeRate-API](https://www.exchangerate-api.com) (`src/app/actions/fx.ts`,
  `EXCHANGE_RATE_API_KEY`) — rates refresh daily and are cached for an hour
  per currency pair. You can still type over the field, and a "Use current
  rate" link re-fetches it on demand. Editing an existing foreign-currency
  entry keeps its originally stored rate rather than silently refreshing
  it — click "Use current rate" if you want today's instead. If the key is
  missing or the lookup fails, the field is simply left blank for manual
  entry. The rate and both currency amounts are stored on the transaction
  (`fx_amount`, `fx_currency`, `fx_rate`).
- **Sharing, added on top of a single-user design.** The design itself is
  a personal tracker with no invite/member screens. This build keeps the
  owner/member shared-workspace model: any signed-in workspace member sees
  and can log entries against the same household ledger, categories are
  workspace-collaborative (any member can add/edit them), and an owner can
  invite people by email, change roles, or remove members from
  **Settings → Manage members** (`/settings/members`) — a section designed
  to match Broadsheet visually but authored fresh, since the handoff has
  no equivalent screen. An invite is accepted automatically the next time
  the invited email signs up or signs in (`accept_pending_invites()` in
  the migration) — no notification email is sent yet (see Follow-ups).
- **Recurring entries are projections, not auto-generated.** "Coming up in
  {month}" on Overview projects each recurring transaction from this
  month onto next month's calendar; it doesn't create a real entry until
  you log one. This matches the design handoff's own README, which
  explicitly defers real auto-generation to a later production phase.

## Project structure

```
src/
  app/
    (app)/            Authenticated routes: overview, activity, summary, settings
    actions/          Server Actions (auth, transactions, categories, members, export)
    welcome/, confirm/  Auth screens
  components/          UI components, grouped by screen (editor/, settings/, activity/…)
  lib/
    data/              Server-side data-fetching + aggregation per screen
    supabase/          Browser / server / admin Supabase clients
    workspace.ts        Current-workspace resolution (cookie-backed)
    editor-context.tsx, toast-context.tsx, workspace-context.tsx   React contexts
supabase/migrations/    SQL schema + RLS policies
```

## Follow-ups (not built yet)

- **OAuth providers** — register apps with Google/Apple/Microsoft/GitHub,
  add credentials in Supabase Auth, remove the `disabled` prop from the
  provider buttons in `WelcomeForm`.
- **Receipt scanning/OCR** — Step B of the Add/Edit sheet, storing the
  photo and running extraction server-side.
- **Invite emails** — currently silent; `src/lib/supabase/admin.ts`'s
  service-role client could call `auth.admin.inviteUserByEmail` (or an
  email provider like Resend) to actually notify invited people.
- **PWA polish** — add `screenshots` to `public/manifest.json` for a
  richer install prompt, and consider a maskable icon variant.
