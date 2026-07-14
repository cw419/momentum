import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { assertFreshCoverageMetadata } from './coverage-metadata.mjs';

const repoRoot = process.cwd();
const coverageDirectory = path.join(repoRoot, 'coverage');
const coveragePath = path.join(coverageDirectory, 'coverage-final.json');
const metadataPath = path.join(coverageDirectory, 'metadata.json');
const reportsDir = path.join(repoRoot, 'reports', 'quality');
const outPath = path.join(reportsDir, 'test-coverage-hotspots.json');

await fs.mkdir(reportsDir, { recursive: true });

function normalizePath(filePath) {
  return filePath.replace(/\\/g, '/');
}

function isProductionSource(relativePath) {
  return (
    /^src\/.*\.(ts|tsx)$/.test(relativePath) &&
    !/\.d\.ts$/.test(relativePath) &&
    !/\.(test|spec)\.(ts|tsx)$/.test(relativePath) &&
    !relativePath.includes('/__tests__/') &&
    !relativePath.startsWith('src/test/') &&
    relativePath !== 'src/lib/database.types.ts' &&
    !/\.config\.(ts|tsx)$/.test(relativePath)
  );
}

function listProductionSources() {
  const result = spawnSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', '--', 'src'],
    {
      cwd: repoRoot,
      encoding: 'utf8',
    },
  );
  if ((result.status ?? 1) !== 0) {
    throw new Error(`Unable to list production sources: ${result.stderr}`);
  }
  return result.stdout
    .split(/\r?\n/)
    .map(normalizePath)
    .filter(Boolean)
    .filter(isProductionSource)
    .filter((relativePath) => existsSync(path.join(repoRoot, relativePath)))
    .sort();
}

function pct(covered, total) {
  return total === 0 ? 100 : Number(((covered / total) * 100).toFixed(2));
}

function summarizeCoverage(relativePath, coverage) {
  if (!coverage) {
    return {
      file: relativePath,
      missingFromCoverage: true,
      statements: 0,
      branches: 0,
      functions: 0,
      uncoveredStatementCount: null,
      uncoveredBranchCount: null,
      uncoveredFunctionCount: null,
      uncoveredLineCount: null,
      uncoveredLines: [],
    };
  }

  const statementCounts = Object.values(coverage.s ?? {});
  const functionCounts = Object.values(coverage.f ?? {});
  const branchCounts = Object.values(coverage.b ?? {}).flatMap((hits) =>
    Array.isArray(hits) ? hits : [],
  );
  const coveredStatements = statementCounts.filter((hits) => hits > 0).length;
  const coveredFunctions = functionCounts.filter((hits) => hits > 0).length;
  const coveredBranches = branchCounts.filter((hits) => hits > 0).length;
  const uncoveredLines = Object.entries(coverage.statementMap ?? {})
    .filter(([id]) => (coverage.s?.[id] ?? 0) === 0)
    .map(([, location]) => location?.start?.line)
    .filter(Number.isInteger);
  const uniqueUncoveredLines = [...new Set(uncoveredLines)].sort(
    (left, right) => left - right,
  );

  return {
    file: relativePath,
    missingFromCoverage: false,
    statements: pct(coveredStatements, statementCounts.length),
    branches: pct(coveredBranches, branchCounts.length),
    functions: pct(coveredFunctions, functionCounts.length),
    uncoveredStatementCount: statementCounts.length - coveredStatements,
    uncoveredBranchCount: branchCounts.length - coveredBranches,
    uncoveredFunctionCount: functionCounts.length - coveredFunctions,
    uncoveredLineCount: uniqueUncoveredLines.length,
    uncoveredLines: uniqueUncoveredLines.slice(0, 30),
  };
}

const [rawCoverage, metadata] = await Promise.all([
  fs.readFile(coveragePath, 'utf8').then(JSON.parse),
  fs.readFile(metadataPath, 'utf8').then(JSON.parse),
]);
await assertFreshCoverageMetadata(repoRoot, metadata);

const coverageByRelativePath = new Map(
  Object.entries(rawCoverage).map(([absolutePath, coverage]) => [
    normalizePath(path.relative(repoRoot, absolutePath)),
    coverage,
  ]),
);
const files = listProductionSources().map((relativePath) =>
  summarizeCoverage(relativePath, coverageByRelativePath.get(relativePath)),
);

const hotspots = [...files].sort((left, right) => {
  if (left.missingFromCoverage !== right.missingFromCoverage) {
    return left.missingFromCoverage ? -1 : 1;
  }
  const leftUncovered =
    (left.uncoveredStatementCount ?? 0) + (left.uncoveredBranchCount ?? 0);
  const rightUncovered =
    (right.uncoveredStatementCount ?? 0) + (right.uncoveredBranchCount ?? 0);
  if (leftUncovered !== rightUncovered) return rightUncovered - leftUncovered;
  if (left.branches !== right.branches) return left.branches - right.branches;
  return left.file.localeCompare(right.file);
});

const payload = {
  schemaVersion: 3,
  generatedAt: new Date().toISOString(),
  sourceCoverage: normalizePath(path.relative(repoRoot, coveragePath)),
  sourceMetadata: metadata,
  fileCount: files.length,
  missingFileCount: files.filter((file) => file.missingFromCoverage).length,
  zeroExecutedFileCount: files.filter(
    (file) => !file.missingFromCoverage && file.statements === 0,
  ).length,
  top20: hotspots.slice(0, 20),
};

await fs.writeFile(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(
  `[coverage-hotspots] analyzed ${files.length} production files; ${payload.missingFileCount} missing from coverage; ${payload.zeroExecutedFileCount} with zero executed statements.`,
);
console.log(
  `[coverage-hotspots] report: ${normalizePath(path.relative(repoRoot, outPath))}`,
);
