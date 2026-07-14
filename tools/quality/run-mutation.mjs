import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  computeConfigHash,
  computeScopeHash,
  computeWorkspaceHash,
  getGitHead,
  getStrykerVersion,
  resolveMutationMode,
  sha256,
} from './mutation-metadata.mjs';

const repoRoot = process.cwd();

function readModeArgument() {
  const modeIndex = process.argv.indexOf('--mode');
  if (modeIndex !== -1) {
    return process.argv[modeIndex + 1];
  }
  if (process.argv.includes('--critical')) return 'critical';
  return 'nightly';
}

const descriptor = resolveMutationMode(readModeArgument());
const reportPath = path.join(repoRoot, descriptor.reportFile);
const metadataPath = path.join(repoRoot, descriptor.metadataFile);
const configPath = path.join(repoRoot, descriptor.configFile);
const strykerBinPath = path.join(
  repoRoot,
  'node_modules',
  '@stryker-mutator',
  'core',
  'bin',
  'stryker.js',
);

await fs.mkdir(path.dirname(reportPath), { recursive: true });
await Promise.all([
  fs.rm(reportPath, { force: true }),
  fs.rm(metadataPath, { force: true }),
]);

const startedAt = new Date().toISOString();
const gitHead = getGitHead(repoRoot);
const workspaceHash = await computeWorkspaceHash(repoRoot);
const configHash = await computeConfigHash(repoRoot, descriptor);
const scopeHash = computeScopeHash(descriptor);
const strykerVersion = await getStrykerVersion(repoRoot);

const result = spawnSync(
  process.execPath,
  [strykerBinPath, 'run', configPath],
  {
    cwd: repoRoot,
    env: process.env,
    stdio: 'inherit',
  },
);

if (result.error) {
  console.error(`[mutation] Failed to start Stryker: ${result.error.message}`);
}

let reportHash = null;
try {
  reportHash = sha256(await fs.readFile(reportPath));
} catch {
  // The metadata below deliberately records a missing/incomplete report.
}

const finalWorkspaceHash = await computeWorkspaceHash(repoRoot);
const metadata = {
  schemaVersion: 1,
  mode: descriptor.mode,
  startedAt,
  generatedAt: new Date().toISOString(),
  gitHead,
  workspaceHash,
  workspaceStable: workspaceHash === finalWorkspaceHash,
  configFile: descriptor.configFile,
  configDependencies: descriptor.configDependencies,
  configHash,
  scopeHash,
  reportPath: descriptor.reportFile,
  reportHash,
  strykerVersion,
  strykerExitCode: result.status,
  reportProduced: reportHash !== null,
};

await fs.writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);

if (!metadata.workspaceStable) {
  console.error(
    '[mutation] Workspace changed while Stryker was running; the report is marked stale.',
  );
}
if (!metadata.reportProduced) {
  console.error(`[mutation] Stryker did not produce ${descriptor.reportFile}.`);
}

process.exitCode = result.status ?? 1;
