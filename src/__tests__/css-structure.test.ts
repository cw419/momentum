import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';

const REPO_ROOT = process.cwd();
const SCRIPT_PATH = path.join(
  REPO_ROOT,
  'tools',
  'quality',
  'css-structure.mjs',
);
const tempDirs: string[] = [];

async function createFixture(css: string, source = '') {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'momentum-css-'));
  tempDirs.push(root);
  const cssRoot = path.join(root, 'styles');
  const sourceRoot = path.join(root, 'source');
  await Promise.all([
    fs.mkdir(cssRoot, { recursive: true }),
    fs.mkdir(sourceRoot, { recursive: true }),
  ]);
  await Promise.all([
    fs.writeFile(path.join(cssRoot, 'fixture.css'), css, 'utf8'),
    fs.writeFile(path.join(sourceRoot, 'fixture.tsx'), source, 'utf8'),
  ]);
  return { root, cssRoot, sourceRoot };
}

function runFixture(fixture: Awaited<ReturnType<typeof createFixture>>) {
  return spawnSync(process.execPath, [SCRIPT_PATH], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    env: {
      ...process.env,
      CSS_STRUCTURE_CSS_ROOT: fixture.cssRoot,
      CSS_STRUCTURE_SOURCE_ROOT: fixture.sourceRoot,
      CSS_STRUCTURE_REPORT_PATH: path.join(fixture.root, 'report.json'),
    },
  });
}

describe('CSS structure quality gate', () => {
  afterEach(async () => {
    await Promise.all(
      tempDirs
        .splice(0)
        .map((dir) => fs.rm(dir, { recursive: true, force: true })),
    );
  });

  it('rejects duplicate selectors, dead classes, and global controls', async () => {
    const fixture = await createFixture(`
      @layer components {
        .duplicate { color: red; }
        .duplicate { color: blue; }
        .dead-class { display: block; }
        button { min-height: 48px; }
      }
    `);

    const result = runFixture(fixture);
    const output = `${result.stdout}${result.stderr}`;

    expect(result.status).toBe(1);
    expect(output).toContain('duplicate-selector');
    expect(output).toContain('unused-class');
    expect(output).toContain('global-interactive-selector');
  });

  it('accepts referenced scoped controls and base element defaults', async () => {
    const fixture = await createFixture(
      `
        @layer base { button { font: inherit; } }
        @layer components { .field button { min-height: 48px; } }
      `,
      `export const view = <div className="field" />;`,
    );

    const result = runFixture(fixture);

    expect(result.status).toBe(0);
  });
});
