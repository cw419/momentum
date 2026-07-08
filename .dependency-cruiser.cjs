/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-domain-to-ui',
      comment:
        'Pure domain logic must not depend on React components or the app shell.',
      severity: 'error',
      from: { path: '^src/domain/' },
      to: { path: '^src/(components|app)/' },
    },
    {
      name: 'no-storage-to-domain-hooks',
      comment:
        'Storage implementations must not import React domain hooks.',
      severity: 'error',
      from: { path: '^src/(storage|infra)/' },
      to: { path: '^src/hooks/domains/' },
    },
    {
      name: 'no-component-to-supabase-infra',
      comment:
        'UI components must go through the storage abstraction — never import Supabase infra directly.',
      severity: 'error',
      from: { path: '^src/components/' },
      to: { path: '^src/infra/storage/supabase/' },
    },
    {
      name: 'no-component-direct-storage',
      comment:
        'UI components must go through domain hooks — never import the storage adapter directly.',
      severity: 'error',
      from: { path: '^src/components/' },
      to: { path: '^src/storage/' },
    },
    {
      name: 'no-app-to-storage',
      comment:
        'AppShell must use domain hooks, not bypass them by importing storage or infra directly.',
      severity: 'error',
      from: { path: '^src/app/' },
      to: { path: '^src/(storage|infra)/' },
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    moduleSystems: ['es6', 'cjs'],
    tsConfig: {
      fileName: 'tsconfig.app.json',
    },
    reporterOptions: {
      text: {
        highlightFocused: true,
      },
    },
  },
};
