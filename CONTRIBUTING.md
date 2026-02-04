# Contributing

Thanks for contributing to Momentum.

## Prerequisites

- Node.js: see `package.json` `engines.node` (or use `.nvmrc`)
- Install deps: `npm install`

## Local Development

```bash
npm run dev
```

## Before You Open a PR (local, low-friction)

Run the checks that match what you touched:

```bash
# Always safe
npm run format:check
npm run lint
npm run typecheck
npm test

# If you touched CSS or docs
npm run lint:css
npm run lint:md
npm run lint:spell
npm run lint:spell:docs
```

Notes:
- This repo intentionally avoids pre-commit hooks; all checks are explicit `npm run ...` commands.
- ESLint forbids `console.*` in `src/` (use `logger` from `src/utils/logger.ts`).

## Deeper Quality Checks (optional)

```bash
npm run quality:type-coverage
npm run quality:knip
npm run quality:ts-prune
npm run quality:depcheck
npm run quality:circular:report
npm run quality:sonar:report
npm run quality:smell-audit
```

Most quality reports write to `reports/quality/`.

## Security Checks (optional locally; CI runs soft scans)

```bash
npm run security:npm-audit
npm run security:semgrep   # requires semgrep installed (recommended: pipx install semgrep)
npm run lint:sql           # requires sqlfluff installed (recommended: pipx install sqlfluff)
```

## Testing

- Smoke subset (CI-safe): `npm test`
- Full unit suite: `npm run test:all`
- Integration suite: `npm run test:integration`
- DB suite: `npm run test:db`
- Performance suite: `npm run test:performance`

## Database / Supabase Changes

If your change touches the database:

1. Add a new migration in `supabase/migrations/` (don’t edit old migrations in-place).
2. Keep RLS user-scoped and narrow (avoid widening access).
3. If you change schema, update app-side types (`src/lib/database.types.ts`) and storage mapping code.
4. Keep the UI layer isolated from Supabase: go through `useStorage()` → domain hooks → services → `MomentumStorage`.

## License

By contributing, you agree your contributions are licensed under the repository license (see `LICENSE`).

