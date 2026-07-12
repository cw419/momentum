import type { RSIPExecutionRecord, RSIPNode, RSIPRunRecord } from '../../types';
import { getDescendantCount } from '../../utils/rsipTree';
import type {
  RSIPInsightSummary,
  RSIPRiskNode,
  RSIPTrendDirection,
  RSIPTrendSnapshot,
} from './rsipInsightsTypes';

export const LOOKBACK_DAYS = 14;
export const DAY_MS = 24 * 60 * 60 * 1000;

function toDirection(values: number[]): RSIPTrendDirection {
  if (values.length < 2) return 'insufficient_data';
  const delta = values[values.length - 1] - values[0];
  if (Math.abs(delta) < 0.5) return 'flat';
  return delta > 0 ? 'up' : 'down';
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export interface ComputedRiskData {
  riskNodes: RSIPRiskNode[];
  highRiskNodes: RSIPRiskNode[];
  ruralFirstCandidates: RSIPRiskNode[];
}

export function computeSummary(
  nodes: RSIPNode[],
  executionRecords: RSIPExecutionRecord[],
  policyLibrarySize: number,
  runCount: number,
  linkCount: number,
  lookbackThreshold: Date,
): RSIPInsightSummary {
  const records14d = executionRecords.filter(
    (record) => record.executedAt >= lookbackThreshold,
  );
  const executed14d = records14d.filter(
    (record) => record.status === 'executed',
  ).length;
  const violated14d = records14d.filter(
    (record) => record.status === 'violated',
  ).length;
  const tracked14d = executed14d + violated14d;

  const strictNodeCount = nodes.filter(
    (node) => (node.stabilityPhase ?? 'E0') !== 'E0',
  ).length;
  const passiveCount = nodes.filter((node) => node.isPassive).length;
  const reinforcedCount = nodes.filter(
    (node) => (node.reinforcementLevel ?? 0) > 0,
  ).length;

  return {
    activeNodeCount: nodes.length,
    strictNodeCount,
    passiveNodeRatio: nodes.length > 0 ? round(passiveCount / nodes.length) : 0,
    reinforcementCoverage:
      nodes.length > 0 ? round(reinforcedCount / nodes.length) : 0,
    policyLibrarySize,
    runCount,
    linkCount,
    executionCount14d: executed14d,
    violationCount14d: violated14d,
    successRate14d: tracked14d > 0 ? round(executed14d / tracked14d) : null,
  };
}

export function computeTrends(
  runHistory: RSIPRunRecord[],
  lookbackThreshold: Date,
): RSIPTrendSnapshot {
  const sortedRuns = [...runHistory].sort((a, b) => a.runNumber - b.runNumber);
  const maxNodeSeries = sortedRuns.map((run) => run.maxNodeCount);
  const durationSeries = sortedRuns.map((run) => run.durationDays);
  const collapseFrequency14d = sortedRuns.filter(
    (run) => run.endedAt && run.endedAt >= lookbackThreshold,
  ).length;

  return {
    maxNodeTrend: toDirection(maxNodeSeries),
    runDurationTrend: toDirection(durationSeries),
    collapseFrequency14d,
    averageMaxNodeCount: round(average(maxNodeSeries)),
    averageRunDurationDays: round(average(durationSeries)),
  };
}

export function computeRiskNodes(
  nodes: RSIPNode[],
  executionRecords: RSIPExecutionRecord[],
  lookbackThreshold: Date,
): ComputedRiskData {
  const records14d = executionRecords.filter(
    (record) => record.executedAt >= lookbackThreshold,
  );

  const executionStatsByNode = new Map<
    string,
    { executed: number; violated: number }
  >();
  for (const record of records14d) {
    if (record.status !== 'executed' && record.status !== 'violated') continue;
    const current = executionStatsByNode.get(record.nodeId) ?? {
      executed: 0,
      violated: 0,
    };
    if (record.status === 'executed') current.executed += 1;
    if (record.status === 'violated') current.violated += 1;
    executionStatsByNode.set(record.nodeId, current);
  }

  const riskNodes = nodes
    .map((node) => {
      const phaseWeight =
        node.stabilityPhase === 'E2' ? 3 : node.stabilityPhase === 'E1' ? 2 : 1;
      const reinforcementMultiplier =
        (node.reinforcementLevel ?? 0) > 0 ? 0.3 : 1;
      const failureCost = round(
        (getDescendantCount(nodes, node.id) + 1) *
          phaseWeight *
          reinforcementMultiplier,
      );
      const stats = executionStatsByNode.get(node.id) ?? {
        executed: 0,
        violated: 0,
      };
      const tracked = stats.executed + stats.violated;
      const violationRate = tracked > 0 ? round(stats.violated / tracked) : 0;
      return {
        nodeId: node.id,
        title: node.title,
        failureCost,
        executed: stats.executed,
        violated: stats.violated,
        violationRate,
      };
    })
    .sort((a, b) => {
      const scoreA = a.failureCost * (1 + a.violationRate) + a.violated * 0.5;
      const scoreB = b.failureCost * (1 + b.violationRate) + b.violated * 0.5;
      return scoreB - scoreA;
    });

  const highRiskNodes = riskNodes.filter(
    (node) =>
      node.failureCost >= 4 &&
      (node.violated >= 1 || node.violationRate >= 0.4),
  );

  const ruralFirstCandidates = riskNodes
    .filter((node) => node.failureCost <= 2.5)
    .sort((a, b) => {
      if (a.violationRate !== b.violationRate)
        return a.violationRate - b.violationRate;
      return b.executed - a.executed;
    })
    .slice(0, 5);

  return { riskNodes, highRiskNodes, ruralFirstCandidates };
}
