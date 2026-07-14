import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

export const COVERAGE_CONFIG_FILES = Object.freeze([
  'vitest.coverage.config.ts',
  'src/test/setup.ts',
  'src/test/setup.integration.ts',
]);

export function getHeadSha(repoRoot) {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  if ((result.status ?? 1) !== 0) {
    throw new Error(`Unable to resolve HEAD: ${result.stderr.trim()}`);
  }
  return result.stdout.trim();
}

export async function getCoverageWorkspaceHash(repoRoot) {
  const hash = createHash('sha256');
  const trackedDiff = spawnSync(
    'git',
    ['diff', '--binary', '--no-ext-diff', 'HEAD', '--', '.'],
    { cwd: repoRoot },
  );
  if ((trackedDiff.status ?? 1) !== 0) {
    throw new Error(
      `Unable to hash tracked workspace changes: ${trackedDiff.stderr.toString().trim()}`,
    );
  }

  const untracked = spawnSync(
    'git',
    ['ls-files', '--others', '--exclude-standard', '-z'],
    { cwd: repoRoot, encoding: 'utf8' },
  );
  if ((untracked.status ?? 1) !== 0) {
    throw new Error(
      `Unable to list untracked workspace files: ${untracked.stderr.trim()}`,
    );
  }

  hash.update(trackedDiff.stdout);
  const untrackedFiles = untracked.stdout
    .split('\0')
    .filter(Boolean)
    .map((file) => file.replace(/\\/g, '/'))
    .sort();
  for (const relativePath of untrackedFiles) {
    hash.update(`\0${relativePath}\0`);
    hash.update(await fs.readFile(path.join(repoRoot, relativePath)));
  }
  return hash.digest('hex');
}

export async function getCoverageConfigHash(repoRoot) {
  const hash = createHash('sha256');
  for (const relativePath of COVERAGE_CONFIG_FILES) {
    hash.update(relativePath);
    hash.update('\0');
    hash.update(await fs.readFile(path.join(repoRoot, relativePath)));
    hash.update('\0');
  }
  return hash.digest('hex');
}

export async function createCoverageMetadata(repoRoot, workspaceHash) {
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    headSha: getHeadSha(repoRoot),
    configHash: await getCoverageConfigHash(repoRoot),
    configFiles: COVERAGE_CONFIG_FILES,
    sourceInclude: ['src/**/*.{ts,tsx}'],
    workspaceHash: workspaceHash ?? (await getCoverageWorkspaceHash(repoRoot)),
  };
}

export async function assertFreshCoverageMetadata(repoRoot, metadata) {
  const expectedHead = getHeadSha(repoRoot);
  const expectedConfigHash = await getCoverageConfigHash(repoRoot);
  const expectedWorkspaceHash = await getCoverageWorkspaceHash(repoRoot);
  if (metadata?.headSha !== expectedHead) {
    throw new Error(
      `Coverage report is stale: expected HEAD ${expectedHead}, found ${metadata?.headSha ?? 'missing'}`,
    );
  }
  if (metadata?.configHash !== expectedConfigHash) {
    throw new Error(
      'Coverage report is stale: coverage configuration changed.',
    );
  }
  if (metadata?.workspaceHash !== expectedWorkspaceHash) {
    throw new Error('Coverage report is stale: source or test files changed.');
  }
}
