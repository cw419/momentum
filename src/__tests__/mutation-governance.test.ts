import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = process.cwd();
const MUTATION_SCOPE_GATE_PATH = path.join(
  REPO_ROOT,
  'tools',
  'quality',
  'mutation-scope-gate.mjs',
);

describe('mutation scope governance', () => {
  it('keeps governed domain files inside the mutation scope', () => {
    const result = spawnSync(process.execPath, [MUTATION_SCOPE_GATE_PATH], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });

    expect(`${result.stdout}${result.stderr}`).toContain(
      '[mutation-scope] PASSED',
    );
    expect(result.status).toBe(0);
  });
});
