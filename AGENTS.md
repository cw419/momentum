# Momentum (Codex Agent Notes)

## Quick Start

- Install deps: `npm install`
- Dev server: `npm run dev`
- Typecheck: `npm run typecheck`
- Lint: `npm run lint`
- Tests: `npm test` (CI-safe subset), `npm run test:db`, `npm run test:integration`

## Database (Supabase) Focus

### Where the database lives

- Migrations: `supabase/migrations/*.sql` (PostgreSQL + RLS + functions)
- Schema reference: `docs/DATABASE_SCHEMA.md`
- Manual migration notes: `apply-migration.md` (Supabase Dashboard SQL Editor fallback)

### Supabase client + types

- Client: `src/lib/supabase.ts`
  - Uses env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (see `.env.example`)
  - Uses typed schema: `src/lib/database.types.ts` (`Database`)
- Lightweight config check (no SDK import): `src/utils/supabaseConfig.ts`

### App-side data access pattern

- Storage contract: `src/storage/MomentumStorage.ts`
- Supabase implementation: `src/infra/storage/supabase/SupabaseStorage.ts`
  - Table modules: `src/infra/storage/supabase/{chains,sessions,history,rsip,betting,checkin,userSettings}.ts`
  - Mapping layer: `src/infra/storage/supabase/mappers.ts`
- UI must not talk to Supabase directly; go through `useStorage()` → domain hooks → `MomentumStorage`.

### When you change the database

1. Add a new migration in `supabase/migrations/` (don’t edit old migrations in-place).
2. Keep RLS consistent: user-scoped tables should enforce `auth.uid() = user_id` (or equivalent) and avoid widening access.
3. Update app code to match:
   - `src/lib/database.types.ts` (regenerate/update to match schema)
   - any affected mappers + storage modules in `src/infra/storage/supabase/`
   - the `MomentumStorage` interface + local adapter when needed (`src/storage/localStorageAdapter.ts`)
4. If a migration introduces new columns, ensure Supabase storage gracefully handles older schemas when possible (many modules already include “missing column” fallbacks).

### Supabase CLI (typical workflow)

- Apply migrations: `supabase db push` (or `supabase migration up`)
- Regenerate types (example): `supabase gen types typescript --schema public > src/lib/database.types.ts`
  - Adjust flags/project linkage to match your Supabase CLI setup.

### DB RPC functions used by the app

- Betting: `place_task_bet`, `create_write_session`, `complete_write_session`, `complete_task_with_betting`
  - Defined/updated across `supabase/migrations/20250905*.sql` and `supabase/migrations/20250906*.sql`
  - Called from `src/infra/storage/supabase/betting.ts`
- Check-in: `perform_daily_checkin`, `get_user_checkin_stats`
  - Defined in `supabase/migrations/20250904000000_add_daily_checkin_system.sql`
  - Called from `src/infra/storage/supabase/checkin.ts`
