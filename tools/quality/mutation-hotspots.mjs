import fs from 'node:fs/promises';
import path from 'node:path';
import {
  computeConfigHash,
  computeScopeHash,
  computeWorkspaceHash,
  getGitHead,
  getStrykerVersion,
  normalizePath,
  resolveMutationMode,
  sha256,
} from './mutation-metadata.mjs';

const repoRoot = process.cwd();

function readModeArgument() {
  const modeIndex = process.argv.indexOf('--mode');
  return modeIndex === -1 ? 'nightly' : process.argv[modeIndex + 1];
}

function toPct(numerator, denominator) {
  if (denominator === 0) return 0;
  return Number(((numerator / denominator) * 100).toFixed(2));
}

function summarizeMutants(mutants) {
  const summary = {
    total: 0,
    killed: 0,
    survived: 0,
    noCoverage: 0,
    timeout: 0,
    ignored: 0,
    other: 0,
  };

  for (const mutant of mutants) {
    switch (mutant.status) {
      case 'Killed':
        summary.killed += 1;
        break;
      case 'Survived':
        summary.survived += 1;
        break;
      case 'NoCoverage':
        summary.noCoverage += 1;
        break;
      case 'Timeout':
        summary.timeout += 1;
        break;
      case 'Ignored':
      case 'CompileError':
      case 'RuntimeError':
      case 'Pending':
        summary.ignored += 1;
        break;
      default:
        summary.other += 1;
    }
  }

  summary.total =
    summary.killed + summary.survived + summary.noCoverage + summary.timeout;
  const detected = summary.killed + summary.timeout;
  const covered = detected + summary.survived;

  return {
    ...summary,
    detected,
    undetected: summary.survived + summary.noCoverage,
    mutationScore: toPct(detected, summary.total),
    coveredMutationScore: toPct(detected, covered),
  };
}

function addSummaries(items) {
  return summarizeMutants(
    items.flatMap((item) => [
      ...Array(item.killed).fill({ status: 'Killed' }),
      ...Array(item.survived).fill({ status: 'Survived' }),
      ...Array(item.noCoverage).fill({ status: 'NoCoverage' }),
      ...Array(item.timeout).fill({ status: 'Timeout' }),
      ...Array(item.ignored).fill({ status: 'Ignored' }),
      ...Array(item.other).fill({ status: 'Unknown' }),
    ]),
  );
}

async function writeResult(descriptor, payload) {
  const outPath = path.join(repoRoot, descriptor.qualityReportFile);
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return outPath;
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function main() {
  const required = process.argv.includes('--required');
  const descriptor = resolveMutationMode(readModeArgument());
  const reportPath = path.join(repoRoot, descriptor.reportFile);
  const metadataPath = path.join(repoRoot, descriptor.metadataFile);
  let metadata;

  try {
    metadata = await readJson(metadataPath);
  } catch {
    const payload = {
      generatedAt: new Date().toISOString(),
      mode: descriptor.mode,
      status: 'not-run',
      source: descriptor.reportFile,
      issues: [`Missing mutation metadata: ${descriptor.metadataFile}`],
    };
    const outPath = await writeResult(descriptor, payload);
    console.warn(`[mutation-hotspots] NOT RUN: ${payload.issues[0]}`);
    console.warn(
      `[mutation-hotspots] report: ${normalizePath(path.relative(repoRoot, outPath))}`,
    );
    if (required) process.exitCode = 1;
    return;
  }

  const freshnessIssues = [];
  let reportBuffer;
  try {
    reportBuffer = await fs.readFile(reportPath);
  } catch {
    freshnessIssues.push(`Missing mutation report: ${descriptor.reportFile}`);
  }

  const currentGitHead = getGitHead(repoRoot);
  const currentWorkspaceHash = await computeWorkspaceHash(repoRoot);
  const currentConfigHash = await computeConfigHash(repoRoot, descriptor);
  const currentScopeHash = computeScopeHash(descriptor);
  const currentStrykerVersion = await getStrykerVersion(repoRoot);

  if (!metadata.reportProduced || !reportBuffer) {
    freshnessIssues.push('The recorded Stryker run did not produce a report.');
  }
  if (!metadata.workspaceStable) {
    freshnessIssues.push('The workspace changed while Stryker was running.');
  }
  if (metadata.mode !== descriptor.mode) {
    freshnessIssues.push(
      'Mutation metadata mode does not match the requested mode.',
    );
  }
  if (metadata.configFile !== descriptor.configFile) {
    freshnessIssues.push('Mutation metadata names a different Stryker config.');
  }
  if (metadata.reportPath !== descriptor.reportFile) {
    freshnessIssues.push('Mutation metadata names a different report path.');
  }
  if (metadata.gitHead !== currentGitHead) {
    freshnessIssues.push(
      'Mutation report was produced for a different Git HEAD.',
    );
  }
  if (metadata.workspaceHash !== currentWorkspaceHash) {
    freshnessIssues.push(
      'Mutation report does not match the current worktree.',
    );
  }
  if (metadata.configHash !== currentConfigHash) {
    freshnessIssues.push(
      'Mutation report does not match the current Stryker config.',
    );
  }
  if (metadata.scopeHash !== currentScopeHash) {
    freshnessIssues.push(
      'Mutation report does not match the current mutation scope.',
    );
  }
  if (metadata.strykerVersion !== currentStrykerVersion) {
    freshnessIssues.push(
      'Mutation report was produced by a different Stryker version.',
    );
  }
  if (reportBuffer && metadata.reportHash !== sha256(reportBuffer)) {
    freshnessIssues.push(
      'Mutation report contents do not match their metadata hash.',
    );
  }

  if (freshnessIssues.length > 0) {
    const payload = {
      generatedAt: new Date().toISOString(),
      mode: descriptor.mode,
      status: 'stale',
      source: descriptor.reportFile,
      metadata: descriptor.metadataFile,
      issues: [...new Set(freshnessIssues)],
    };
    const outPath = await writeResult(descriptor, payload);
    for (const issue of payload.issues) {
      console.error(`[mutation-hotspots] STALE: ${issue}`);
    }
    console.error(
      `[mutation-hotspots] report: ${normalizePath(path.relative(repoRoot, outPath))}`,
    );
    if (required) process.exitCode = 1;
    return;
  }

  const report = JSON.parse(reportBuffer.toString('utf8'));
  const fileSummaries = Object.entries(report.files ?? {}).map(
    ([file, data]) => ({
      file: normalizePath(file),
      ...summarizeMutants(Array.isArray(data.mutants) ? data.mutants : []),
    }),
  );

  fileSummaries.sort((a, b) => {
    if (a.undetected !== b.undetected) return b.undetected - a.undetected;
    if (a.mutationScore !== b.mutationScore)
      return a.mutationScore - b.mutationScore;
    if (a.total !== b.total) return b.total - a.total;
    return a.file.localeCompare(b.file);
  });

  const summary = addSummaries(fileSummaries);
  const gateViolations = [];
  const thresholds = descriptor.perFileThresholds;

  if (thresholds) {
    const byFile = new Map(fileSummaries.map((entry) => [entry.file, entry]));
    for (const target of descriptor.mutate) {
      const fileSummary = byFile.get(target);
      if (!fileSummary) {
        gateViolations.push(`${target}: missing from mutation report`);
        continue;
      }
      if (fileSummary.mutationScore < thresholds.minimumScore) {
        gateViolations.push(
          `${target}: score ${fileSummary.mutationScore}% is below ${thresholds.minimumScore}%`,
        );
      }
      if (fileSummary.noCoverage > thresholds.maximumNoCoverage) {
        gateViolations.push(
          `${target}: ${fileSummary.noCoverage} NoCoverage mutant(s), maximum ${thresholds.maximumNoCoverage}`,
        );
      }
    }
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    mode: descriptor.mode,
    status: gateViolations.length === 0 ? 'passed' : 'failed',
    source: descriptor.reportFile,
    metadata: descriptor.metadataFile,
    run: {
      generatedAt: metadata.generatedAt,
      gitHead: metadata.gitHead,
      workspaceHash: metadata.workspaceHash,
      configHash: metadata.configHash,
      scopeHash: metadata.scopeHash,
      strykerVersion: metadata.strykerVersion,
    },
    thresholds,
    summary,
    files: fileSummaries,
    top20: fileSummaries.slice(0, 20),
    gateViolations,
  };
  const outPath = await writeResult(descriptor, payload);

  console.log(
    `[mutation-hotspots] ${payload.status.toUpperCase()}: analyzed ${fileSummaries.length} files at ${summary.mutationScore}%.`,
  );
  for (const violation of gateViolations) {
    console.error(`[mutation-hotspots] ${violation}`);
  }
  console.log(
    `[mutation-hotspots] report: ${normalizePath(path.relative(repoRoot, outPath))}`,
  );

  if (required && gateViolations.length > 0) {
    process.exitCode = 1;
  }
}

await main();
