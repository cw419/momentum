# Change-management workflow

This guide keeps the codebase, user-facing release notes, and detailed design
documents aligned.

## When a change is complete

1. Update [`CHANGELOG.md`](../../CHANGELOG.md) under **Unreleased**. Record
   user-visible additions, changes, fixes, deprecations, removals, and security
   changes. Do not put internal refactors there unless users can observe an
   effect.
2. Review the design documentation. Update it when a change affects a user
   flow, domain rule, state transition, data model, storage contract, API,
   database schema or migration, architecture boundary, or interaction model.
3. Use the closest existing document in `docs/features/` or `docs/api/`.
   Update `docs/FEATURES_OVERVIEW.md` as well when the visible product feature
   list changes. Create a focused document only when none fits.
4. Stage only the intended changes, including the changelog and any required
   design-document updates. Never stage secrets, local environment files,
   generated files, or Supabase `.temp/` state.
5. Run `npm run ship -- --design-reviewed "type: concise summary"`.

`--design-reviewed` means the author explicitly checked the detailed design
documentation and either updated it or determined that no design logic changed.
The command checks staged-file formatting. When application code or a migration
is staged, it also runs linting, type checking, and the smoke test suite before
committing the already staged changes and pushing the current feature branch.

## Documentation routing

| Change type                                         | Required documentation review                                        |
| --------------------------------------------------- | -------------------------------------------------------------------- |
| New or changed user capability                      | `CHANGELOG.md`, `docs/features/`, and usually `FEATURES_OVERVIEW.md` |
| Domain rule or workflow                             | Relevant `docs/features/DOMAIN_*.md`                                 |
| Database/schema/RLS/migration                       | `docs/api/DATABASE_SCHEMA.md` and migration guide as applicable      |
| Storage, import/export, or serialization contract   | Relevant feature document and API/schema reference                   |
| Architecture/module boundary                        | `docs/guides/ARCHITECTURE.md`                                        |
| Internal refactor with no behavior or design change | `CHANGELOG.md` review only; no entry is needed                       |
