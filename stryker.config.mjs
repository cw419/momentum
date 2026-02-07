import '@stryker-mutator/vitest-runner';

export default {
  testRunner: 'vitest',
  reporters: ['clear-text', 'progress', 'html'],
  mutate: [
    'src/hooks/domains/sessions/*.ts',
    'src/hooks/domains/use*Domain.ts',
    'src/utils/storage/chains.ts',
    'src/utils/storage/sessions.ts',
    'src/utils/storage/rsip.ts',
    'src/utils/storage/pet.ts',
    'src/utils/chain-tree/groupOperations.ts',
    'src/utils/chain-tree/treeBuilder.ts',
    'src/domain/errors.ts',
    'src/domain/result.ts',
    'src/infra/storage/supabase/retry.ts',
    'src/services/errorClassification/ErrorClassifiers.ts',
    'src/services/enhanced-rule-validation/validators/typeMatch.ts',
    'src/services/recovery/RecoveryStrategy.ts',
    'src/utils/local-preferences/timerState.ts',
    '!src/hooks/domains/**/__tests__/**',
  ],
  thresholds: {
    high: 90,
    low: 80,
    break: 84,
  },
  vitest: {
    configFile: 'vitest.ci.config.ts',
  },
  timeoutMS: 60000,
  tempDirName: '.stryker-tmp',
};
