import {
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = process.cwd();
const PACKAGE_JSON_PATH = path.join(REPO_ROOT, 'package.json');
const CI_WORKFLOW_PATH = path.join(REPO_ROOT, '.github', 'workflows', 'ci.yml');
const CODEQL_WORKFLOW_PATH = path.join(
  REPO_ROOT,
  '.github',
  'workflows',
  'codeql.yml',
);
const SEMGREP_WORKFLOW_PATH = path.join(
  REPO_ROOT,
  '.github',
  'workflows',
  'semgrep.yml',
);
const EXCEPTION_RULE_MIGRATION_PATH = path.join(
  REPO_ROOT,
  'src',
  'services',
  'ExceptionRuleMigration.ts',
);
const ARCHITECTURE_VIOLATION_FIXTURE_PATH = path.join(
  REPO_ROOT,
  'src',
  'components',
  '__architecture_violation_fixture__.ts',
);

const COMPATIBILITY_FACADE_ALLOWLIST = [
  'src/components/BettingModal.tsx',
  'src/components/BettingModalView.tsx',
  'src/components/ChainCard.tsx',
  'src/components/ChainDetail.tsx',
  'src/components/ImportExportModal.tsx',
  'src/components/RecycleBinModal.tsx',
  'src/components/TaskGroupEditor.tsx',
  'src/services/ErrorClassificationService.ts',
];

const COMPATIBILITY_FACADE_PATTERNS = [
  /Compatibility facade/i,
  /backward compatibility/i,
  /门面文件/,
  /保持向后兼容/,
];

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

function readFile(filePath: string): string {
  return readFileSync(filePath, 'utf8');
}

function extractNpmRunCommands(workflow: string): string[] {
  return [...workflow.matchAll(/npm run ([A-Za-z0-9:_-]+)/g)].map(
    (match) => match[1],
  );
}

function detectCompatibilityFacades(): string[] {
  const roots = ['src/components', 'src/services'];
  return [
    ...new Set(
      roots
        .flatMap((root) => {
          const absoluteRoot = path.join(REPO_ROOT, root);
          return readdirSync(absoluteRoot).map((entry) =>
            path.join(absoluteRoot, entry),
          );
        })
        .filter((absolutePath) => statSync(absolutePath).isFile())
        .map((absolutePath) => {
          const content = readFile(absolutePath);
          return {
            content,
            relPath: normalizePath(path.relative(REPO_ROOT, absolutePath)),
          };
        })
        .filter(
          ({ content }) =>
            COMPATIBILITY_FACADE_PATTERNS.some((pattern) =>
              pattern.test(content),
            ) && /export\s+.*from\s+['"][.]{1,2}\//.test(content),
        )
        .map(({ relPath }) => relPath),
    ),
  ].sort();
}

describe('repo governance', () => {
  it('ci workflow only invokes the aggregated quality lanes', () => {
    const workflow = readFile(CI_WORKFLOW_PATH);
    const commands = [...new Set(extractNpmRunCommands(workflow))].sort();

    expect(commands).toEqual(['quality:ci:info', 'quality:ci:required']);

    const packageJson = JSON.parse(readFile(PACKAGE_JSON_PATH)) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts['quality:ci:required']).toEqual(
      expect.any(String),
    );
    expect(packageJson.scripts['quality:ci:info']).toEqual(expect.any(String));
    expect(packageJson.scripts['quality:ci:nightly']).toEqual(
      expect.any(String),
    );
  });

  it('fails the architecture gate when UI imports Supabase infrastructure', () => {
    const packageJson = JSON.parse(readFile(PACKAGE_JSON_PATH)) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts['quality:arch-gate']).toMatch(
      /--output-type\s+err(?:\s|$)/,
    );

    writeFileSync(
      ARCHITECTURE_VIOLATION_FIXTURE_PATH,
      "import '../infra/storage/supabase/SupabaseStorage';\n",
      'utf8',
    );

    try {
      const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
      const result = spawnSync(npmCommand, ['run', 'quality:arch-gate'], {
        cwd: REPO_ROOT,
        encoding: 'utf8',
        shell: process.platform === 'win32',
      });
      const output = `${result.stdout}${result.stderr}`;

      expect(result.status).not.toBe(0);
      expect(output).toContain('no-component-to-supabase-infra');
      expect(output).toContain('__architecture_violation_fixture__.ts');
    } finally {
      rmSync(ARCHITECTURE_VIOLATION_FIXTURE_PATH, { force: true });
    }
  }, 15_000);

  it('codeql workflow uses the security-extended query suite', () => {
    const workflow = readFile(CODEQL_WORKFLOW_PATH);

    expect(workflow).toMatch(/queries:\s*security-extended/);
  });

  it('semgrep workflow includes scheduled scans and default-branch gating', () => {
    const workflow = readFile(SEMGREP_WORKFLOW_PATH);

    expect(workflow).toMatch(/schedule:/);
    expect(workflow).toContain('default_branch');
  });

  it('exception rule migration does not import the migration barrel', () => {
    const source = readFile(EXCEPTION_RULE_MIGRATION_PATH);

    expect(source).not.toMatch(/from '\.\/migration'/);
  });

  it('compatibility facades stay on the allowlist and carry a removal date', () => {
    const detected = detectCompatibilityFacades();

    expect(detected).toEqual(COMPATIBILITY_FACADE_ALLOWLIST);

    for (const relativePath of detected) {
      const absolutePath = path.join(REPO_ROOT, relativePath);
      const content = readFile(absolutePath);
      expect(content).toMatch(/@deprecated\s+Remove after \d{4}-\d{2}-\d{2}/);
    }
  });
});
