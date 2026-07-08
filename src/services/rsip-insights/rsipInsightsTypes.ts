import type {
  RSIPExecutionRecord,
  RSIPLibraryEntry,
  RSIPNode,
  RSIPNodeGroup,
  RSIPRunRecord,
  RSIPTaskLink,
} from '../../types';

export type RSIPTrendDirection = 'up' | 'down' | 'flat' | 'insufficient_data';
export type RSIPRecommendationPriority = 'high' | 'medium' | 'low';
export type RSIPRecommendationKind =
  | 'rural_first'
  | 'split'
  | 'grouping'
  | 'passive'
  | 'reinforcement'
  | 'automation'
  | 'rebuild';

export type RSIPInsightsLocale = 'zh' | 'en';

export interface RSIPRiskNode {
  nodeId: string;
  title: string;
  failureCost: number;
  executed: number;
  violated: number;
  violationRate: number;
}

export interface RSIPRecommendation {
  id: string;
  kind: RSIPRecommendationKind;
  priority: RSIPRecommendationPriority;
  title: string;
  rationale: string;
  actions: string[];
  relatedNodeIds?: string[];
}

export interface RSIPInsightSummary {
  activeNodeCount: number;
  strictNodeCount: number;
  passiveNodeRatio: number;
  reinforcementCoverage: number;
  policyLibrarySize: number;
  runCount: number;
  linkCount: number;
  executionCount14d: number;
  violationCount14d: number;
  successRate14d: number | null;
}

export interface RSIPTrendSnapshot {
  maxNodeTrend: RSIPTrendDirection;
  runDurationTrend: RSIPTrendDirection;
  collapseFrequency14d: number;
  averageMaxNodeCount: number;
  averageRunDurationDays: number;
}

export interface BuildRSIPInsightsInput {
  nodes: RSIPNode[];
  runHistory: RSIPRunRecord[];
  executionRecords: RSIPExecutionRecord[];
  groups: RSIPNodeGroup[];
  taskLinks: RSIPTaskLink[];
  policyLibrary: RSIPLibraryEntry[];
  now?: Date;
  locale?: string;
}

export interface RSIPInsightsResult {
  summary: RSIPInsightSummary;
  trends: RSIPTrendSnapshot;
  riskNodes: RSIPRiskNode[];
  ruralFirstCandidates: RSIPRiskNode[];
  recommendations: RSIPRecommendation[];
}

export interface RecommendationContext {
  input: BuildRSIPInsightsInput;
  locale: RSIPInsightsLocale;
  summary: RSIPInsightSummary;
  trends: RSIPTrendSnapshot;
  highRiskNodes: RSIPRiskNode[];
  ruralFirstCandidates: RSIPRiskNode[];
}
