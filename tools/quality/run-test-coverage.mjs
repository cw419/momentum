import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import {
  createCoverageMetadata,
  getCoverageWorkspaceHash,
} from './coverage-metadata.mjs';

const require = createRequire(import.meta.url);
const repoRoot = process.cwd();
const publishedDirectory = path.join(repoRoot, 'coverage');
const temporaryDirectory = await fs.mkdtemp(
  path.join(os.tmpdir(), 'momentum-coverage-'),
);

function resolveVitestBin() {
  const packageJsonPath = require.resolve('vitest/package.json');
  const packageJson = require(packageJsonPath);
  const relativeBin =
    typeof packageJson.bin === 'string'
      ? packageJson.bin
      : packageJson.bin?.vitest;
  if (!relativeBin) {
    throw new Error('Unable to resolve the Vitest executable.');
  }
  return path.resolve(path.dirname(packageJsonPath), relativeBin);
}

try {
  const workspaceHash = await getCoverageWorkspaceHash(repoRoot);
  const result = spawnSync(
    process.execPath,
    [
      resolveVitestBin(),
      'run',
      '--coverage',
      '--config',
      'vitest.coverage.config.ts',
    ],
    {
      cwd: repoRoot,
      env: {
        ...process.env,
        MOMENTUM_COVERAGE_DIR: temporaryDirectory,
      },
      stdio: 'inherit',
    },
  );

  if (result.error) {
    throw result.error;
  }
  if ((result.status ?? 1) !== 0) {
    process.exitCode = result.status ?? 1;
  } else {
    const finalWorkspaceHash = await getCoverageWorkspaceHash(repoRoot);
    if (workspaceHash !== finalWorkspaceHash) {
      throw new Error(
        'Workspace changed while coverage was running; refusing to publish a stale report.',
      );
    }
    const metadata = await createCoverageMetadata(repoRoot, workspaceHash);
    await fs.writeFile(
      path.join(temporaryDirectory, 'metadata.json'),
      `${JSON.stringify(metadata, null, 2)}\n`,
      'utf8',
    );
    await fs.rm(publishedDirectory, { recursive: true, force: true });
    await fs.rename(temporaryDirectory, publishedDirectory);
    console.log(
      `[test-coverage] published fresh report for ${metadata.headSha.slice(0, 12)} to coverage/`,
    );
  }
} finally {
  await fs.rm(temporaryDirectory, { recursive: true, force: true });
}
