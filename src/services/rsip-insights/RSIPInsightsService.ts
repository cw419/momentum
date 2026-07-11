import type {
  BuildRSIPInsightsInput,
  RSIPInsightsResult,
} from './rsipInsightsTypes';
import {
  computeRiskNodes,
  computeSummary,
  computeTrends,
  DAY_MS,
  LOOKBACK_DAYS,
} from './rsipStatsCalculator';
import { toLocale } from './rsipLocalization';
import { buildRecommendations } from './rsipRecommender';

export type { BuildRSIPInsightsInput, RSIPInsightsResult };

export function buildRSIPInsights(
  input: BuildRSIPInsightsInput,
): RSIPInsightsResult {
  const now = input.now ?? new Date();
  const locale = toLocale(input.locale);
  const lookbackThreshold = new Date(now.getTime() - LOOKBACK_DAYS * DAY_MS);

  const summary = computeSummary(
    input.nodes,
    input.executionRecords,
    input.policyLibrary.length,
    input.runHistory.length,
    input.taskLinks.filter((link) => link.isActive).length,
    lookbackThreshold,
  );

  const trends = computeTrends(input.runHistory, lookbackThreshold);

  const { riskNodes, highRiskNodes, ruralFirstCandidates } = computeRiskNodes(
    input.nodes,
    input.executionRecords,
    lookbackThreshold,
  );

  const recommendations = buildRecommendations({
    input,
    locale,
    summary,
    trends,
    highRiskNodes,
    ruralFirstCandidates,
  });

  return {
    summary,
    trends,
    riskNodes,
    ruralFirstCandidates,
    recommendations: recommendations.slice(0, 6),
  };
}
