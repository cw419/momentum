/// <reference types="vitest" />
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const reportsDirectory = path.resolve(
  process.env.MOMENTUM_COVERAGE_DIR ?? 'coverage',
);

const unitInclude = [
  'src/**/*.{test,spec}.{js,ts,jsx,tsx}',
  'src/**/__tests__/**/*.{js,ts,jsx,tsx}',
];

const unitExclude = [
  '**/node_modules/**',
  '**/dist/**',
  '**/*.integration.test.*',
  '**/*.db.test.*',
  '**/*.performance.test.*',
  '**/*-performance.test.*',
  '**/__tests__/**/*.integration.*',
  '**/__tests__/**/*.db.*',
  '**/__tests__/**/*.performance.*',
  '**/__tests__/**/*-performance.*',
  '**/__tests__/**/helpers.ts',
  '**/__tests__/**/testHelpers.ts',
];

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        url: 'http://localhost/',
      },
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          setupFiles: ['./src/test/setup.ts'],
          include: unitInclude,
          exclude: unitExclude,
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          setupFiles: ['./src/test/setup.integration.ts'],
          include: [
            'src/**/*.integration.test.{js,ts,jsx,tsx}',
            'src/**/__tests__/**/*.integration.{js,ts,jsx,tsx}',
          ],
          testTimeout: 30_000,
          hookTimeout: 30_000,
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory,
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.{test,spec}.{ts,tsx}',
        'src/**/__tests__/**',
        'src/test/**',
        'src/lib/database.types.ts',
        'src/**/*.config.{ts,tsx}',
      ],
      thresholds: {
        statements: 74,
        branches: 65,
        functions: 75,
        lines: 75,
      },
    },
  },
});
