import fullConfig from './stryker.config.mjs';
import {
  CRITICAL_MUTATION_TARGETS,
  CRITICAL_MUTATION_TEST_FILES,
  CRITICAL_MUTATION_THRESHOLDS,
} from './tools/quality/mutation-scope.mjs';

export default {
  ...fullConfig,
  reporters: ['clear-text', 'json'],
  mutate: CRITICAL_MUTATION_TARGETS,
  testFiles: CRITICAL_MUTATION_TEST_FILES,
  jsonReporter: {
    fileName: 'reports/mutation/critical.json',
  },
  thresholds: {
    high: 100,
    low: CRITICAL_MUTATION_THRESHOLDS.minimumScore,
    break: CRITICAL_MUTATION_THRESHOLDS.minimumScore,
  },
  tempDirName: '.stryker-tmp/critical',
};
