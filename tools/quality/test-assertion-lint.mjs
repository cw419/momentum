import fs from 'node:fs/promises';
import path from 'node:path';
import {
  analyzeTestSource,
  TEST_ASSERTION_RULES,
} from './test-assertion-analyzer.mjs';

const repoRoot = process.cwd();
const reportsDir = path.join(repoRoot, 'reports', 'quality');
const outPath = path.join(reportsDir, 'test-assertion-lint.json');
const TEST_FILE_PATTERN = /\.(test|spec)\.[cm]?[jt]sx?$/;

await fs.mkdir(reportsDir, { recursive: true });

function normalizePath(filePath) {
  return filePath.replace(/\\/g, '/');
}

async function listTestFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (['node_modules', 'dist', 'coverage'].includes(entry.name)) continue;
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listTestFiles(absolutePath)));
    } else if (TEST_FILE_PATTERN.test(entry.name)) {
      files.push(absolutePath);
    }
  }
  return files;
}

const files = await listTestFiles(path.join(repoRoot, 'src'));
const violations = [];

for (const file of files) {
  const content = await fs.readFile(file, 'utf8');
  const relativeFile = normalizePath(path.relative(repoRoot, file));
  violations.push(
    ...analyzeTestSource({ content, filePath: file }).map((violation) => ({
      file: relativeFile,
      ...violation,
    })),
  );
}

const payload = {
  schemaVersion: 2,
  generatedAt: new Date().toISOString(),
  totalTestFilesScanned: files.length,
  rules: TEST_ASSERTION_RULES,
  violationCount: violations.length,
  violations,
};

await fs.writeFile(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

if (violations.length > 0) {
  console.error(
    `[test-assertion-lint] found ${violations.length} weak assertion or SUT-mock violation(s).`,
  );
  for (const violation of violations) {
    console.error(
      `- ${violation.file}:${violation.line} ${violation.rule}: ${violation.detail}`,
    );
  }
  process.exitCode = 1;
} else {
  console.log(
    `[test-assertion-lint] scanned ${files.length} files; no weak assertions or direct SUT mocks found.`,
  );
}
console.log(
  `[test-assertion-lint] report: ${normalizePath(path.relative(repoRoot, outPath))}`,
);
