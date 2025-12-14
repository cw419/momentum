/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: [
      'src/services/__tests__/CheckinService.test.ts',
      'src/services/__tests__/RuleClassificationService.test.ts',
      'src/components/__tests__/PureDOMSlider.mobile.test.tsx',
      'src/utils/__tests__/time.formatting.test.ts'
    ],
    exclude: ['**/node_modules/**', '**/dist/**']
  }
});
