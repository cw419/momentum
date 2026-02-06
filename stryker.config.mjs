import '@stryker-mutator/vitest-runner';

export default {
  testRunner: 'vitest',
  reporters: ['clear-text', 'progress', 'html'],
  mutate: [
    'src/hooks/domains/sessions/*.ts',
    'src/hooks/domains/use*Domain.ts',
    '!src/hooks/domains/**/__tests__/**',
  ],
  thresholds: {
    high: 85,
    low: 70,
    break: 70,
  },
  vitest: {
    configFile: 'vitest.ci.config.ts',
  },
  timeoutMS: 60000,
  tempDirName: '.stryker-tmp',
};
