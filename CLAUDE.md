# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

# Salda — working notes for agents

Mobile-first household **cost & income tracker**. Next.js 16 (App Router) +
Supabase (Postgres, Auth, RLS). See `README.md` for product scope, setup, and
deliberate "not built yet" decisions; this file covers how the code is laid
out and the conventions to follow when changing it.

## Repository layout gotcha

The app lives in `salda/`, which is **its own git repository** nested inside
the outer `CostTracker` repo. Run all `npm`/`next`/`git` commands from
`salda/` — `package.json`, `.git`, and `node_modules` are all here, not at the
`CostTracker` root.

## Commands

```bash
npm run dev     # next dev (Turbopack) — http://localhost:3000, redirects to /welcome
npm run build   # production build
npm run start   # serve the production build
npm run lint    # eslint (eslint-config-next)
npm run typecheck  # next typegen + tsc (app and test code)
npm test        # unit tests (Vitest, tests/unit)
npm run test:e2e   # end-to-end tests (Playwright, tests/e2e); see README "Automated tests"
```

"Done" means it builds, lints clean, type-checks and the tests pass. Signed-in E2E tests need
`E2E_EMAIL` / `E2E_PASSWORD` for a test account on a DEV Supabase project (never production);
without them they skip. When you add or change UI, keep selectors in `tests/e2e/helpers.ts` in sync
and add/adjust tests; tests that create data must name it with the `E2E-` prefix (the `tag` fixture).

`node check-supabase.mjs` is a one-off connectivity probe against the configured
Supabase project, not part of the app.

Imports use the `@/*` → `src/*` path alias (`tsconfig.json`); prefer
`@/lib/...` over long relative paths.

## Environment

Copy `.env.example` → `.env.local`. Required keys: `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server-only,
bypasses RLS), `EXCHANGE_RATE_API_KEY` (server-only, FX pre-fill). The
`NEXT_PUBLIC_*` pair is the only thing the browser ever sees.

## Architecture

**Server-first.** Pages and the data layer are Server Components / Server
Actions. Client Components (`"use client"`) are only the interactive pieces
(forms, the Add/Edit sheet, nav, toasts). Mutations are **Server Actions** in
`src/app/actions/*`, called from client components; they return
`{ error }` or `{ success, toast }` and call `revalidatePath(...)` to refresh
the affected screens. Never fetch via API routes — there are none.

**Supabase clients** (`src/lib/supabase/`): pick the right one.
- `server.ts` → `createClient()` — request-scoped (closes over cookies).
  Use in Server Components / Actions. **Call it fresh per use; never cache it.**
- `client.ts` → browser client for Client Components.
- `middleware.ts` → session refresh, used only by `src/proxy.ts`.
- `admin.ts` → service-role, **bypasses RLS**. `import "server-only"`; use only
  for the narrow privileged case (invites). Never import from a client file.

**Auth gating** lives in `src/proxy.ts` (Next.js 16 renamed `middleware.ts` →
`proxy.ts`). It refreshes the Supabase session every request and redirects
signed-out users to `/welcome`. Public paths: `/welcome`, `/confirm`,
`/auth/callback`. Signup uses a **6-digit OTP** (`verifyOtp`), not a magic link
— the Supabase email template must be configured for `{{ .Token }}` (README §3).

**Workspaces (the tenancy model).** Every row is scoped to a `workspace_id`; a
workspace is a shared household ledger with owner/member roles. On first
sign-in `ensureWorkspace()` silently creates one (`<name>'s Salda`, base
currency BAM) plus starter categories — there is no "create workspace" screen.
The active workspace is resolved by `getCurrentWorkspace()` from the
`current_workspace` cookie (falling back to the first membership) and provided
to the authenticated tree via `WorkspaceProvider` in `src/app/(app)/layout.tsx`.
Email invites are accepted automatically on next login via the
`accept_pending_invites()` RPC (called from every auth action).

**Access control is enforced in the database**, not the app — Row Level
Security on every table (`0001_init.sql`). App code assumes RLS is on; when
adding a table or column, add the matching policy in the same migration.

## Data layer & screens

- `src/app/(app)/{overview,activity,summary,settings}` — each page is a thin
  Server Component that calls its matching aggregator in `src/lib/data/*.ts`
  (`overview.ts`, `activity.ts`, `summary.ts`, `categories.ts`, `members.ts`,
  `settings.ts`). Put query + aggregation logic in `lib/data`, keep pages thin.
- Supabase caps a response at **1000 rows** — paginate when a total could
  exceed that (see `getAllTimeBalance` in `data/overview.ts` for the pattern).
- Money: amounts are stored in the workspace **base currency**; round with
  `Math.round(n * 100) / 100`. Foreign-currency entries also store the original
  `fx_amount` / `fx_currency` / `fx_rate` snapshot (see `transactions.ts`
  `resolveAmount`). Format via `src/lib/currency.ts`, never raw `toFixed`.
- Charts are **plain CSS bars** (`src/lib/bars.ts`), no chart library —
  matching the design handoff. Don't add one.

## Internationalization (en / bs)

All UI text goes through the i18n layer — **never hardcode user-facing
strings**. Add keys to both `en` and `bs` in `src/lib/i18n/messages.ts`
(`bs` is type-checked against `en`, so a missing translation fails the build).
- Server code: `const { t } = await getT()` (`src/lib/i18n/server.ts`).
- Client code: the hook/provider in `src/lib/i18n/client.tsx`.
- Plurals: `tn(base, n)`; dates: `fmtDate()`; numbers/currency use the
  locale-aware helpers in `src/lib/i18n/index.ts` + `currency.ts`.
- User-entered data (merchants, notes, category names) is never translated;
  default category names are seeded per-locale from `i18n/categories.ts`.

## Styling

Tailwind v4 for layout utilities only. The "Broadsheet" design system
(`.btn`, `.card`, `.tag`, `.chip`, `.seg`, `.dialog`, …) and all color tokens
(`var(--color-*)`) are hand-ported in `src/app/globals.css`. Use the existing
component classes and CSS variables rather than ad-hoc styles or new colors.

## Database schema

Single migration: `supabase/migrations/0001_init.sql` (tables, triggers,
RPCs, and all RLS policies). The hand-written TypeScript mirror is
`src/types/database.ts` — **keep the two in sync**; query results are cast to
these types at each call site (the Supabase client is intentionally not
generic-typed). Note: `README.md` mentions a `0002_fix_rls_recursion.sql`
that does not exist in this tree — the non-recursive policies are already in
`0001`; ignore that step.
