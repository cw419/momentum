import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const repoRoot = process.cwd();
const mutationHtmlPath = path.join(repoRoot, 'reports', 'mutation', 'mutation.html');
const reportsDir = path.join(repoRoot, 'reports', 'quality');
const outPath = path.join(reportsDir, 'test-mutation-hotspots.json');

await fs.mkdir(reportsDir, { recursive: true });

function extractObjectLiteral(source, marker) {
  const markerIndex = source.indexOf(marker);
  if (markerIndex === -1) {
    throw new Error(`Marker not found: ${marker}`);
  }

  const start = source.indexOf('{', markerIndex + marker.length);
  if (start === -1) {
    throw new Error('Could not find object start');
  }

  let depth = 0;
  let i = start;
  let inString = false;
  let stringQuote = '';
  let escaped = false;

  for (; i < source.length; i += 1) {
    const ch = source[i];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (ch === stringQuote) {
        inString = false;
        stringQuote = '';
      }
      continue;
    }

    if (ch === '"' || ch === "'" || ch === '`') {
      inString = true;
      stringQuote = ch;
      continue;
    }

    if (ch === '{') {
      depth += 1;
      continue;
    }

    if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        return source.slice(start, i + 1);
      }
    }
  }

  throw new Error('Could not find matching closing brace');
}

function toPct(numerator, denominator) {
  if (denominator === 0) return 0;
  return Number(((numerator / denominator) * 100).toFixed(2));
}

const html = await fs.readFile(mutationHtmlPath, 'utf8');
const objectLiteral = extractObjectLiteral(html, 'app.report = ');
const report = vm.runInNewContext(`(${objectLiteral})`);

const statusGroups = {
  killed: new Set(['Killed']),
  survived: new Set(['Survived']),
  noCoverage: new Set(['NoCoverage']),
  timeout: new Set(['Timeout', 'TimedOut']),
  ignored: new Set(['Ignored', 'CompileError', 'RuntimeError', 'Pending']),
};

const fileSummaries = [];

for (const [file, data] of Object.entries(report.files ?? {})) {
  const mutants = Array.isArray(data.mutants) ? data.mutants : [];

  let killed = 0;
  let survived = 0;
  let noCoverage = 0;
  let timeout = 0;
  let other = 0;

  for (const mutant of mutants) {
    const status = mutant.status;
    if (statusGroups.killed.has(status)) {
      killed += 1;
    } else if (statusGroups.survived.has(status)) {
      survived += 1;
    } else if (statusGroups.noCoverage.has(status)) {
      noCoverage += 1;
    } else if (statusGroups.timeout.has(status)) {
      timeout += 1;
    } else {
      other += 1;
    }
  }

  const total = mutants.length;
  const undetected = survived + noCoverage + timeout;

  fileSummaries.push({
    file,
    total,
    killed,
    survived,
    noCoverage,
    timeout,
    other,
    undetected,
    mutationScore: toPct(killed, total),
    undetectedRate: toPct(undetected, total),
  });
}

fileSummaries.sort((a, b) => {
  if (a.undetected !== b.undetected) return b.undetected - a.undetected;
  if (a.undetectedRate !== b.undetectedRate) return b.undetectedRate - a.undetectedRate;
  if (a.total !== b.total) return b.total - a.total;
  return a.file.localeCompare(b.file);
});

const totals = fileSummaries.reduce(
  (acc, item) => {
    acc.total += item.total;
    acc.killed += item.killed;
    acc.survived += item.survived;
    acc.noCoverage += item.noCoverage;
    acc.timeout += item.timeout;
    acc.other += item.other;
    return acc;
  },
  { total: 0, killed: 0, survived: 0, noCoverage: 0, timeout: 0, other: 0 }
);

const payload = {
  generatedAt: new Date().toISOString(),
  source: path.relative(repoRoot, mutationHtmlPath).replace(/\\/g, '/'),
  thresholds: report.thresholds ?? null,
  summary: {
    ...totals,
    undetected: totals.survived + totals.noCoverage + totals.timeout,
    mutationScore: toPct(totals.killed, totals.total),
  },
  top20: fileSummaries.slice(0, 20),
};

await fs.writeFile(outPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');

console.log(`[mutation-hotspots] analyzed ${fileSummaries.length} files.`);
console.log(`[mutation-hotspots] report: ${path.relative(repoRoot, outPath).replace(/\\/g, '/')}`);
