import { runConfiguredLane } from './quality-runner.mjs';

const laneId = process.argv[2] ?? 'info';
const summary = await runConfiguredLane(laneId);

process.exit(summary.exitCode);
