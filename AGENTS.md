# Momentum (Codex Agent Notes)

## Quick Start

- Install deps: `npm install`
- Dev server: `npm run dev`
- Typecheck: `npm run typecheck`
- Lint: `npm run lint`

## Testing (Vitest)

### Commands

- CI-smoke subset: `npm test` (uses `vitest.ci.config.ts`)
- Unit suite: `npm run test:all` (uses `vitest.config.ts`)
- Integration suite: `npm run test:integration` (uses `vitest.integration.config.ts`)
- "DB" suite: `npm run test:db` (uses `vitest.db.config.ts`)
- Performance suite: `npm run test:performance` (uses `vitest.performance.config.ts`)
- Watch: `npm run test:watch` (CI subset) or `npm run test:all:watch`
- Coverage: `npm run test:coverage`

### Test file conventions

- Unit: `src/**/*.{test,spec}.{js,ts,jsx,tsx}` and `src/**/__tests__/**/*.{js,ts,jsx,tsx}`
  - Excludes `*.integration.test.*`, `*.db.test.*`, `*.performance.test.*`
- Integration: `*.integration.test.*` or `src/**/__tests__/**/*.integration.*`
- DB: `*.db.test.*` or `src/**/__tests__/**/*.db.*`
- Performance: `*.performance.test.*` or `src/**/__tests__/**/*.performance.*`

### Test harness notes

- Shared setup: `src/test/setup.ts` (mocks storage APIs, suppresses `console.*`)
- Integration setup: `src/test/setup.integration.ts`
  - Uses MSW handlers: `src/test/mocks/supabaseMocks.ts`
  - Mocks `import.meta.env` for Supabase config
  - Uses fake timers; advance timers when needed
- DB setup: `src/test/setup.db.ts`
  - Uses in-memory helpers: `src/test/utils/testDatabase.ts`
  - Mocks `src/lib/supabase.ts` to use a test client (no real Supabase required)

### When adding/changing tests

- Prefer unit tests unless behavior depends on storage/network boundaries.
- If you add a new Supabase REST/RPC call used in integration tests, update `src/test/mocks/supabaseMocks.ts`.
- If you add/rename a storage method on `MomentumStorage`, update both implementations and add coverage in the relevant suite.

## Backend / Database (Supabase)

Momentum has no custom backend server: "backend" = Supabase (Postgres + RLS + SQL functions/RPC).

### Where the database lives

- Migrations: `supabase/migrations/*.sql` (PostgreSQL + RLS + functions)
- Schema reference: `docs/DATABASE_SCHEMA.md`
- Manual migration notes: `apply-migration.md` (Supabase Dashboard SQL Editor fallback)

### Supabase client + types

- Client wrapper: `src/lib/supabase.ts`
  - Uses env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (see `.env.example`)
  - Uses typed schema: `src/lib/database.types.ts` (`Database`)
- Lightweight config check (no SDK import): `src/utils/supabaseConfig.ts`

### App-side data access pattern (must follow)

- Storage contract: `src/storage/MomentumStorage.ts`
- Supabase implementation: `src/infra/storage/supabase/SupabaseStorage.ts`
  - Table modules: `src/infra/storage/supabase/{auth,chains,sessions,history,rsip,betting,checkin,taskTimeStats,userSettings}.ts`
  - Mapping layer: `src/infra/storage/supabase/mappers.ts`
- Local/offline implementation: `src/storage/localStorageAdapter.ts`
- UI must not talk to Supabase directly; go through `useStorage()` -> domain hooks (`src/hooks/domains/`) -> services (`src/services/`) -> `MomentumStorage`.

### When you change the database (checklist)

1. Add a new migration in `supabase/migrations/` (do not edit old migrations in-place).
2. Keep RLS consistent: user-scoped tables should enforce `auth.uid() = user_id` (or equivalent) and avoid widening access.
3. Be careful with RPC functions:
   - Avoid function overloading (Supabase RPC can resolve the wrong overload).
   - Keep parameter names/types aligned with `.rpc()` calls (named args are used in the app).
   - For `SECURITY DEFINER` functions, do explicit auth checks (e.g. `target_user_id = auth.uid()`).
4. Update app code to match:
   - `src/lib/database.types.ts` (regenerate/update to match schema)
   - affected mappers + storage modules in `src/infra/storage/supabase/`
   - the `MomentumStorage` interface + `src/storage/localStorageAdapter.ts` if the interface changes
5. If a migration introduces new columns, keep Supabase storage resilient to older schemas when reasonable (many modules already include missing-column fallbacks).

### Supabase CLI (typical workflow)

- Apply migrations: `supabase db push` (or `supabase migration up`)
- Regenerate types (example): `supabase gen types typescript --schema public > src/lib/database.types.ts`
  - Adjust flags/project linkage to match your Supabase CLI setup.

### DB RPC functions used by the app

- Betting:
  - `place_task_bet`, `complete_task_with_betting`
  - Write sessions: `create_write_session`, `complete_write_session`
  - Defined/updated across `supabase/migrations/20250905*.sql` and `supabase/migrations/20250906*.sql`
  - Called from `src/infra/storage/supabase/betting.ts`
- Check-in:
  - `perform_daily_checkin`, `get_user_checkin_stats`
  - Defined in `supabase/migrations/20250904000000_add_daily_checkin_system.sql`
  - Called from `src/infra/storage/supabase/checkin.ts`
