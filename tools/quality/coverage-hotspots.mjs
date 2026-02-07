import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = process.cwd();
const coveragePath = path.join(repoRoot, 'coverage', 'coverage-final.json');
const reportsDir = path.join(repoRoot, 'reports', 'quality');
const outPath = path.join(reportsDir, 'test-coverage-hotspots.json');

await fs.mkdir(reportsDir, { recursive: true });

async function ensureCoverage() {
  try {
    await fs.access(coveragePath);
    return;
  } catch {
    // continue
  }

  const run = spawnSync('npm', ['run', 'test:coverage'], {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: true,
  });

  if ((run.status ?? 1) !== 0) {
    throw new Error(`Failed to generate coverage report (exit ${run.status ?? 'unknown'})`);
  }
}

function pct(covered, total) {
  return total === 0 ? 100 : Number(((covered / total) * 100).toFixed(2));
}

function isTestFile(relPath) {
  return /\.(test|spec)\.[cm]?[jt]sx?$/.test(relPath) || relPath.includes('/__tests__/');
}

await ensureCoverage();
const raw = JSON.parse(await fs.readFile(coveragePath, 'utf8'));

const files = [];

for (const [filePath, coverage] of Object.entries(raw)) {
  const relPath = path.relative(repoRoot, filePath).replace(/\\/g, '/');
  if (!relPath.startsWith('src/')) continue;
  if (isTestFile(relPath)) continue;

  const statementCounts = Object.values(coverage.s ?? {});
  const functionCounts = Object.values(coverage.f ?? {});
  const branchCounts = Object.values(coverage.b ?? {}).flatMap((hits) => Array.isArray(hits) ? hits : []);

  const coveredStatements = statementCounts.filter((hits) => (hits ?? 0) > 0).length;
  const coveredFunctions = functionCounts.filter((hits) => (hits ?? 0) > 0).length;
  const coveredBranches = branchCounts.filter((hits) => (hits ?? 0) > 0).length;

  const uncoveredLines = [];
  const statementMap = coverage.statementMap ?? {};
  for (const [id, loc] of Object.entries(statementMap)) {
    const count = coverage.s?.[id] ?? 0;
    if (count === 0 && loc?.start?.line) {
      uncoveredLines.push(loc.start.line);
    }
  }

  const uniqueUncoveredLines = [...new Set(uncoveredLines)].sort((a, b) => a - b);

  files.push({
    file: relPath,
    statements: pct(coveredStatements, statementCounts.length),
    branches: pct(coveredBranches, branchCounts.length),
    functions: pct(coveredFunctions, functionCounts.length),
    uncoveredStatementCount: statementCounts.length - coveredStatements,
    uncoveredBranchCount: branchCounts.length - coveredBranches,
    uncoveredFunctionCount: functionCounts.length - coveredFunctions,
    uncoveredLineCount: uniqueUncoveredLines.length,
    uncoveredLines: uniqueUncoveredLines.slice(0, 30),
  });
}

const hotspots = [...files].sort((a, b) => {
  if (a.branches !== b.branches) return a.branches - b.branches;
  if (a.statements !== b.statements) return a.statements - b.statements;
  if (a.uncoveredBranchCount !== b.uncoveredBranchCount) return b.uncoveredBranchCount - a.uncoveredBranchCount;
  if (a.uncoveredStatementCount !== b.uncoveredStatementCount) return b.uncoveredStatementCount - a.uncoveredStatementCount;
  return a.file.localeCompare(b.file);
});

const payload = {
  generatedAt: new Date().toISOString(),
  sourceCoverage: path.relative(repoRoot, coveragePath).replace(/\\/g, '/'),
  fileCount: files.length,
  top20: hotspots.slice(0, 20),
};

await fs.writeFile(outPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');

console.log(`[coverage-hotspots] analyzed ${files.length} files.`);
console.log(`[coverage-hotspots] report: ${path.relative(repoRoot, outPath).replace(/\\/g, '/')}`);
