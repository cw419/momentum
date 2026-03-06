import { runConfiguredLane } from './quality-runner.mjs';

const summary = await runConfiguredLane('smell-audit', {
  captureTextReports: true,
});

process.exit(summary.exitCode);
