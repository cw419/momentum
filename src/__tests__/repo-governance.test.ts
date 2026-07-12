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
const WORKFLOWS_DIR = path.join(REPO_ROOT, '.github', 'workflows');
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
const SUPABASE_STORAGE_PATH = path.join(
  REPO_ROOT,
  'src',
  'infra',
  'storage',
  'supabase',
  'SupabaseStorage.ts',
);
const DASHBOARD_PATH = path.join(
  REPO_ROOT,
  'src',
  'components',
  'Dashboard.tsx',
);
const APP_SHELL_CONTAINER_PATH = path.join(
  REPO_ROOT,
  'src',
  'app',
  'AppShellContainer.tsx',
);
const APP_SHELL_DOMAIN_COORDINATOR_PATHS = [
  'useAppShellDomains.ts',
  'useAppShellPrimaryDomains.ts',
  'useAppShellSecondaryDomains.ts',
].map((file) => path.join(REPO_ROOT, 'src', 'app', 'app-shell', file));
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

function readWorkflowSources(): Array<{ file: string; source: string }> {
  return readdirSync(WORKFLOWS_DIR)
    .filter((file) => /\.ya?ml$/.test(file))
    .map((file) => ({
      file,
      source: readFile(path.join(WORKFLOWS_DIR, file)),
    }));
}

function extractRunBlocks(workflow: string): string[] {
  const lines = workflow.split(/\r?\n/);
  const blocks: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    const runMatch = /^(\s*)(?:-\s+)?run:\s*(.*)$/.exec(line);
    if (!runMatch) continue;

    const indent = runMatch[1]?.length ?? 0;
    const inlineCommand = runMatch[2] ?? '';
    if (!/^[>|][+-]?$/.test(inlineCommand)) {
      blocks.push(inlineCommand);
      continue;
    }

    const blockLines: string[] = [];
    while (index + 1 < lines.length) {
      const nextLine = lines[index + 1] ?? '';
      const nextIndent = nextLine.match(/^\s*/)?.[0].length ?? 0;
      if (nextLine.trim() && nextIndent <= indent) break;
      blockLines.push(nextLine);
      index += 1;
    }
    blocks.push(blockLines.join('\n'));
  }

  return blocks;
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
      const npmCliPath = process.env.npm_execpath;
      if (!npmCliPath) {
        throw new Error('npm_execpath is required for the governance test');
      }
      const result = spawnSync(
        process.execPath,
        [npmCliPath, 'run', 'quality:arch-gate'],
        {
          cwd: REPO_ROOT,
          encoding: 'utf8',
        },
      );
      const output = `${result.stdout}${result.stderr}`;

      expect(result.status).not.toBe(0);
      expect(output).toContain('no-component-to-supabase-infra');
      expect(output).toContain('__architecture_violation_fixture__.ts');
    } finally {
      rmSync(ARCHITECTURE_VIOLATION_FIXTURE_PATH, { force: true });
    }
  }, 45_000);

  it('codeql workflow uses the security-extended query suite', () => {
    const workflow = readFile(CODEQL_WORKFLOW_PATH);

    expect(workflow).toMatch(/queries:\s*security-extended/);
  });

  it('semgrep workflow includes scheduled scans and default-branch gating', () => {
    const workflow = readFile(SEMGREP_WORKFLOW_PATH);

    expect(workflow).toMatch(/schedule:/);
    expect(workflow).toContain('default_branch');
  });

  it('pins every third-party action to a full commit SHA', () => {
    const mutableActionReferences = readWorkflowSources().flatMap(
      ({ file, source }) =>
        [...source.matchAll(/^\s*-?\s*uses:\s*([^\s#]+)/gm)]
          .map((match) => match[1] ?? '')
          .filter((reference) => !reference.startsWith('./'))
          .filter((reference) => !/@[0-9a-f]{40}$/i.test(reference))
          .map((reference) => `${file}: ${reference}`),
    );

    expect(mutableActionReferences).toEqual([]);
  });

  it('keeps GitHub context expressions out of shell command bodies', () => {
    const unsafeRunBlocks = readWorkflowSources().flatMap(({ file, source }) =>
      extractRunBlocks(source)
        .filter((runBlock) => /\$\{\{\s*github\./.test(runBlock))
        .map((runBlock) => `${file}: ${runBlock.trim()}`),
    );

    expect(unsafeRunBlocks).toEqual([]);
  });

  it.each(['|', '|-', '|+', '>', '>-', '>+'])(
    'extracts YAML run blocks using the %s scalar marker',
    (marker) => {
      const workflow = [
        'steps:',
        `  - run: ${marker}`,
        '      echo "${{ github.ref_name }}"',
      ].join('\n');

      expect(extractRunBlocks(workflow)).toEqual([
        '      echo "${{ github.ref_name }}"',
      ]);
    },
  );

  it('keeps the Supabase storage composition root below hotspot budgets', () => {
    const source = readFile(SUPABASE_STORAGE_PATH);
    const lineCount = source.split(/\r?\n/).length;
    const directDependencies = new Set(
      [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((match) => match[1]),
    );

    expect(lineCount).toBeLessThanOrEqual(300);
    expect(directDependencies.size).toBeLessThanOrEqual(12);
  });

  it('keeps the Dashboard container below hotspot budgets', () => {
    const source = readFile(DASHBOARD_PATH);
    const lineCount = source.split(/\r?\n/).length;
    const directDependencies = new Set(
      [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((match) => match[1]),
    );

    expect(lineCount).toBeLessThanOrEqual(300);
    expect(directDependencies.size).toBeLessThanOrEqual(12);
  });

  it('keeps the app shell container below hotspot budgets', () => {
    const source = readFile(APP_SHELL_CONTAINER_PATH);
    const lineCount = source.split(/\r?\n/).length;
    const directDependencies = new Set(
      [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((match) => match[1]),
    );

    expect(lineCount).toBeLessThanOrEqual(300);
    expect(directDependencies.size).toBeLessThanOrEqual(12);
  });

  it('keeps app shell domain coordinators below hotspot budgets', () => {
    for (const coordinatorPath of APP_SHELL_DOMAIN_COORDINATOR_PATHS) {
      const source = readFile(coordinatorPath);
      const directDependencies = new Set(
        [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map(
          (match) => match[1],
        ),
      );

      expect(source.split(/\r?\n/).length).toBeLessThanOrEqual(300);
      expect(directDependencies.size).toBeLessThanOrEqual(12);
    }
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
