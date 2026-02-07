import fs from 'node:fs/promises';
import path from 'node:path';

const repoRoot = process.cwd();
const reportsDir = path.join(repoRoot, 'reports', 'quality');
await fs.mkdir(reportsDir, { recursive: true });

const TEST_FILE_PATTERN = /\.(test|spec)\.[cm]?[jt]sx?$/;
const ASSERTION_PATTERN = /\btoBe(?:Truthy|Falsy)\s*\(/g;

async function listFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'coverage') {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(fullPath)));
      continue;
    }

    const rel = path.relative(repoRoot, fullPath).replace(/\\/g, '/');
    if (TEST_FILE_PATTERN.test(rel) || rel.includes('/__tests__/')) {
      files.push(fullPath);
    }
  }

  return files;
}

function getLine(content, index) {
  const before = content.slice(0, index);
  return before.split(/\r?\n/).length;
}

const srcDir = path.join(repoRoot, 'src');
const files = await listFiles(srcDir);

const violations = [];

for (const file of files) {
  const content = await fs.readFile(file, 'utf8');
  let match;
  while ((match = ASSERTION_PATTERN.exec(content)) !== null) {
    violations.push({
      file: path.relative(repoRoot, file).replace(/\\/g, '/'),
      line: getLine(content, match.index),
      matcher: match[0].includes('Truthy') ? 'toBeTruthy' : 'toBeFalsy',
    });
  }
}

const payload = {
  generatedAt: new Date().toISOString(),
  totalTestFilesScanned: files.length,
  bannedMatchers: ['toBeTruthy', 'toBeFalsy'],
  violationCount: violations.length,
  violations,
};

const outPath = path.join(reportsDir, 'test-assertion-lint.json');
await fs.writeFile(outPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');

if (violations.length > 0) {
  console.error(`[test-assertion-lint] found ${violations.length} weak assertion(s).`);
  for (const v of violations) {
    console.error(`- ${v.file}:${v.line} uses ${v.matcher}`);
  }
  console.error(`[test-assertion-lint] report: ${path.relative(repoRoot, outPath)}`);
  process.exit(1);
}

console.log(`[test-assertion-lint] scanned ${files.length} files, no banned assertions found.`);
console.log(`[test-assertion-lint] report: ${path.relative(repoRoot, outPath)}`);
