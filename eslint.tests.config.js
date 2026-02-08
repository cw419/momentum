import js from '@eslint/js';
import globals from 'globals';
import testingLibrary from 'eslint-plugin-testing-library';
import vitest from '@vitest/eslint-plugin';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['coverage', 'dist', 'reports', 'tools'],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: [
      'src/**/*.{test,spec}.{js,ts,jsx,tsx}',
      'src/**/__tests__/**/*.{js,ts,jsx,tsx}',
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...vitest.environments.env.globals,
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: false,
    },
    plugins: {
      vitest,
      'testing-library': testingLibrary,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'prefer-const': 'off',
      'vitest/expect-expect': 'off',
      'vitest/no-commented-out-tests': 'error',
      'vitest/no-conditional-tests': 'error',
      'vitest/no-disabled-tests': 'warn',
      'vitest/no-focused-tests': 'error',
      'vitest/no-identical-title': 'error',
      'vitest/prefer-to-be': 'warn',
      'vitest/prefer-to-have-length': 'off',
      'testing-library/await-async-events': 'error',
      'testing-library/await-async-queries': 'error',
      'testing-library/await-async-utils': 'error',
      'testing-library/no-await-sync-events': 'error',
      'testing-library/no-debugging-utils': 'off',
      'testing-library/no-manual-cleanup': 'error',
      'testing-library/no-node-access': 'off',
      'testing-library/no-unnecessary-act': 'off',
      'testing-library/prefer-find-by': 'warn',
      'testing-library/prefer-screen-queries': 'off',
    },
  },
);
