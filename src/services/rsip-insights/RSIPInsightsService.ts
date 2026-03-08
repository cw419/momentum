import type {
  RSIPExecutionRecord,
  RSIPLibraryEntry,
  RSIPNode,
  RSIPNodeGroup,
  RSIPRunRecord,
  RSIPTaskLink,
} from '../../types';
import { getDescendantCount } from '../../utils/rsipTree';

type RSIPTrendDirection = 'up' | 'down' | 'flat' | 'insufficient_data';
type RSIPRecommendationPriority = 'high' | 'medium' | 'low';
type RSIPRecommendationKind =
  | 'rural_first'
  | 'split'
  | 'grouping'
  | 'passive'
  | 'reinforcement'
  | 'automation'
  | 'rebuild';

type RSIPInsightsLocale = 'zh' | 'en';

interface RSIPRiskNode {
  nodeId: string;
  title: string;
  failureCost: number;
  executed: number;
  violated: number;
  violationRate: number;
}

interface RSIPRecommendation {
  id: string;
  kind: RSIPRecommendationKind;
  priority: RSIPRecommendationPriority;
  title: string;
  rationale: string;
  actions: string[];
  relatedNodeIds?: string[];
}

interface RSIPInsightSummary {
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

interface RSIPTrendSnapshot {
  maxNodeTrend: RSIPTrendDirection;
  runDurationTrend: RSIPTrendDirection;
  collapseFrequency14d: number;
  averageMaxNodeCount: number;
  averageRunDurationDays: number;
}

interface BuildRSIPInsightsInput {
  nodes: RSIPNode[];
  runHistory: RSIPRunRecord[];
  executionRecords: RSIPExecutionRecord[];
  groups: RSIPNodeGroup[];
  taskLinks: RSIPTaskLink[];
  policyLibrary: RSIPLibraryEntry[];
  now?: Date;
  locale?: string;
}

interface RSIPInsightsResult {
  summary: RSIPInsightSummary;
  trends: RSIPTrendSnapshot;
  riskNodes: RSIPRiskNode[];
  ruralFirstCandidates: RSIPRiskNode[];
  recommendations: RSIPRecommendation[];
}

const LOOKBACK_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

function toLocale(locale?: string): RSIPInsightsLocale {
  if (typeof locale === 'string' && locale.toLowerCase().startsWith('zh')) {
    return 'zh';
  }
  return 'en';
}

function localize(locale: RSIPInsightsLocale, zh: string, en: string): string {
  return locale === 'zh' ? zh : en;
}

function joinList(values: string[], locale: RSIPInsightsLocale): string {
  return values.join(locale === 'zh' ? '、' : ', ');
}

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

function fallbackAlternative(
  nodeTitle: string,
  locale: RSIPInsightsLocale,
): string {
  const lower = nodeTitle.toLowerCase();

  if (
    lower.includes('sleep') ||
    nodeTitle.includes('睡') ||
    nodeTitle.includes('作息')
  ) {
    return localize(
      locale,
      '替代方案：先固定起床时间，再逐步提前入睡。',
      'Fallback: lock wake-up time first, then shift bedtime.',
    );
  }

  if (
    lower.includes('exercise') ||
    lower.includes('workout') ||
    nodeTitle.includes('运动') ||
    nodeTitle.includes('锻炼')
  ) {
    return localize(
      locale,
      '替代方案：使用 5 分钟最低运动版本。',
      'Fallback: use a 5-minute minimum exercise version.',
    );
  }

  if (
    lower.includes('diet') ||
    lower.includes('food') ||
    nodeTitle.includes('饮食') ||
    nodeTitle.includes('进食')
  ) {
    return localize(
      locale,
      '替代方案：每天先替换 1 个高糖项目。',
      'Fallback: replace one high-sugar item per day.',
    );
  }

  return localize(
    locale,
    '替代方案：先降级为 10 分钟版本，持续 7 天。',
    'Fallback: reduce to a 10-minute version for 7 days.',
  );
}

interface RecommendationContext {
  input: BuildRSIPInsightsInput;
  locale: RSIPInsightsLocale;
  summary: RSIPInsightSummary;
  trends: RSIPTrendSnapshot;
  highRiskNodes: RSIPRiskNode[];
  ruralFirstCandidates: RSIPRiskNode[];
}

function buildRuralFirstRecommendation(
  context: RecommendationContext,
): RSIPRecommendation | null {
  const { highRiskNodes, locale, ruralFirstCandidates, trends } = context;
  if (highRiskNodes.length === 0 && trends.collapseFrequency14d < 2) {
    return null;
  }

  const primaryRisks = highRiskNodes.slice(0, 2);
  const candidateTitles = ruralFirstCandidates
    .slice(0, 3)
    .map((item) => item.title);

  return {
    id: 'rural-first-reboot',
    kind: 'rural_first',
    priority: 'high',
    title: localize(
      locale,
      '农村包围城市重启：先稳住低成本国策',
      'Rural-first reboot: stabilize low-cost policies first',
    ),
    rationale: localize(
      locale,
      '近期违约/崩溃表明高成本中心节点不稳定，应从低成本、高成功率的边缘国策重建。',
      'Recent violations/collapses suggest central high-cost nodes are unstable. Rebuild from low-cost, high-success edge policies.',
    ),
    actions: [
      primaryRisks.length > 0
        ? localize(
            locale,
            `临时冻结高风险节点：${joinList(
              primaryRisks.map((node) => node.title),
              locale,
            )}`,
            `Temporarily freeze high-risk nodes: ${joinList(
              primaryRisks.map((node) => node.title),
              locale,
            )}`,
          )
        : localize(
            locale,
            '先冻结 1 个不稳定核心国策 3-7 天。',
            'Freeze one unstable central policy for 3-7 days.',
          ),
      candidateTitles.length > 0
        ? localize(
            locale,
            `优先推进这些低成本候选：${joinList(candidateTitles, locale)}`,
            `Prioritize these low-cost candidates: ${joinList(candidateTitles, locale)}`,
          )
        : localize(
            locale,
            '优先推进 2-3 个 failure cost <= 2.5 的低成本国策。',
            'Promote 2-3 low-cost policies with failure cost <= 2.5.',
          ),
      ...primaryRisks.map(
        (node) => `${node.title}: ${fallbackAlternative(node.title, locale)}`,
      ),
    ],
    relatedNodeIds: primaryRisks.map((node) => node.nodeId),
  };
}

function buildSplitRecommendation(
  context: RecommendationContext,
): RSIPRecommendation | null {
  const top = context.highRiskNodes[0];
  if (!top) {
    return null;
  }

  return {
    id: 'split-high-risk',
    kind: 'split',
    priority: 'high',
    title: localize(
      context.locale,
      `拆分高风险国策：${top.title}`,
      `Split high-risk policy: ${top.title}`,
    ),
    rationale: localize(
      context.locale,
      '高失败成本叠加高违约频率，说明该国策粒度过大。',
      'High failure cost combined with frequent violations indicates this policy is oversized.',
    ),
    actions: [
      localize(
        context.locale,
        '使用拆分流程拆成 3-5 条微国策。',
        'Use split workflow to break into 3-5 micro policies.',
      ),
      localize(
        context.locale,
        '至少包含 1 条被动护栏型国策。',
        'Ensure at least one passive guardrail is included.',
      ),
      localize(
        context.locale,
        '确保每条子国策能在 10-20 分钟内执行。',
        'Keep each sub-policy executable within 10-20 minutes.',
      ),
    ],
    relatedNodeIds: [top.nodeId],
  };
}

function buildGroupingRecommendation(
  context: RecommendationContext,
): RSIPRecommendation | null {
  const ungroupedNodes = context.input.nodes.filter((node) => !node.groupId)
    .length;
  if (ungroupedNodes < 4 || context.input.groups.length > 0) {
    return null;
  }

  return {
    id: 'enable-groups',
    kind: 'grouping',
    priority: 'medium',
    title: localize(
      context.locale,
      '建立国策组并配置容错',
      'Create policy groups with fault tolerance',
    ),
    rationale: localize(
      context.locale,
      '节点多且未分组时，级联风险难以控制。',
      'Many independent nodes without grouping make cascade risk harder to control.',
    ),
    actions: [
      localize(
        context.locale,
        '先为相关分支建立 1-2 个国策组。',
        'Create 1-2 policy groups for related branches.',
      ),
      localize(
        context.locale,
        '每组先从容错 = 1 开始。',
        'Start with fault tolerance = 1 for each group.',
      ),
      localize(
        context.locale,
        '将高度相关的节点放入同一组。',
        'Move high-correlation nodes into the same group.',
      ),
    ],
  };
}

function buildReinforcementRecommendation(
  context: RecommendationContext,
): RSIPRecommendation | null {
  const e2WithoutReinforcement = context.input.nodes.filter(
    (node) =>
      node.stabilityPhase === 'E2' && (node.reinforcementLevel ?? 0) === 0,
  );
  if (
    e2WithoutReinforcement.length === 0 ||
    (context.summary.successRate14d != null && context.summary.successRate14d < 0.6)
  ) {
    return null;
  }

  return {
    id: 'reinforce-e2',
    kind: 'reinforcement',
    priority: 'medium',
    title: localize(
      context.locale,
      '强化稳定 E2 节点',
      'Reinforce stable E2 nodes',
    ),
    rationale: localize(
      context.locale,
      '稳定但未强化的节点，通过少量投入即可显著提高抗回滚能力。',
      'Stable nodes without reinforcement can improve rollback resilience with small extra effort.',
    ),
    actions: [
      localize(
        context.locale,
        `优先强化这些节点：${joinList(
          e2WithoutReinforcement.slice(0, 3).map((node) => node.title),
          context.locale,
        )}`,
        `Reinforce these nodes first: ${joinList(
          e2WithoutReinforcement.slice(0, 3).map((node) => node.title),
          context.locale,
        )}`,
      ),
      localize(
        context.locale,
        '每成功执行一周增加 1 层强化。',
        'Increase one reinforcement level per successful week.',
      ),
    ],
    relatedNodeIds: e2WithoutReinforcement.map((node) => node.id),
  };
}

function buildPassiveRecommendation(
  context: RecommendationContext,
): RSIPRecommendation | null {
  if (
    context.summary.passiveNodeRatio >= 0.2 ||
    context.summary.violationCount14d === 0
  ) {
    return null;
  }

  return {
    id: 'add-passive-guards',
    kind: 'passive',
    priority: 'medium',
    title: localize(context.locale, '增加被动护栏', 'Add passive guardrails'),
    rationale: localize(
      context.locale,
      '近期存在违约且被动国策覆盖率偏低，环境护栏可以降低摩擦。',
      'Passive policy coverage is low while recent violations exist. Environment guardrails can reduce friction.',
    ),
    actions: [
      localize(
        context.locale,
        '每条不稳定分支至少增加 1 条被动国策。',
        'Add at least one passive policy for each unstable branch.',
      ),
      localize(
        context.locale,
        '优先使用自动化/环境改造，降低意志力负担。',
        'Prefer automation/environment changes over willpower-heavy actions.',
      ),
      localize(
        context.locale,
        '显式标记被动节点，便于追踪。',
        'Mark passive nodes explicitly for tracking.',
      ),
    ],
  };
}

function buildAutomationRecommendation(
  context: RecommendationContext,
): RSIPRecommendation | null {
  if (context.summary.linkCount !== 0) {
    return null;
  }

  return {
    id: 'configure-links',
    kind: 'automation',
    priority: 'low',
    title: localize(
      context.locale,
      '启用 RSIP-任务流程联动',
      'Enable RSIP-task process links',
    ),
    rationale: localize(
      context.locale,
      '当前未检测到活动链接，事件驱动同步可提升一致性与执行效率。',
      'No active links detected. Event-driven synchronization improves consistency and execution speed.',
    ),
    actions: [
      localize(
        context.locale,
        '先配置 task_completed -> mark_rsip_executed。',
        'Start with task_completed -> mark_rsip_executed.',
      ),
      localize(
        context.locale,
        '关键任务再加 rsip_mark_executed -> prompt_start_chain。',
        'Add rsip_mark_executed -> prompt_start_chain for key tasks.',
      ),
      localize(
        context.locale,
        'RSIP->任务侧初期保持 confirm 模式。',
        'Keep RSIP->task side in confirm mode initially.',
      ),
    ],
  };
}

function buildRebuildRecommendation(
  context: RecommendationContext,
): RSIPRecommendation | null {
  if (
    context.trends.maxNodeTrend !== 'down' &&
    context.trends.runDurationTrend !== 'down'
  ) {
    return null;
  }

  return {
    id: 'rebuild-from-library',
    kind: 'rebuild',
    priority: 'medium',
    title: localize(
      context.locale,
      '使用国策库辅助重建',
      'Use library-assisted rebuild',
    ),
    rationale: localize(
      context.locale,
      '轮次趋势下滑，优先恢复已验证国策，而不是只新增新国策。',
      'Run trends are declining. Reintroduce proven policies from library instead of adding only new ones.',
    ),
    actions: [
      localize(
        context.locale,
        '从国策库恢复 1-2 条高内化条目。',
        'Restore 1-2 high-internalization entries from policy library.',
      ),
      localize(
        context.locale,
        '本周避免引入超过 1 条新的高风险国策。',
        'Avoid introducing more than one new high-risk policy this week.',
      ),
    ],
  };
}

function buildRecommendations(
  context: RecommendationContext,
): RSIPRecommendation[] {
  return [
    buildRuralFirstRecommendation(context),
    buildSplitRecommendation(context),
    buildGroupingRecommendation(context),
    buildReinforcementRecommendation(context),
    buildPassiveRecommendation(context),
    buildAutomationRecommendation(context),
    buildRebuildRecommendation(context),
  ].filter((recommendation): recommendation is RSIPRecommendation =>
    Boolean(recommendation),
  );
}

export function buildRSIPInsights(
  input: BuildRSIPInsightsInput,
): RSIPInsightsResult {
  const now = input.now ?? new Date();
  const locale = toLocale(input.locale);
  const lookbackThreshold = new Date(now.getTime() - LOOKBACK_DAYS * DAY_MS);

  const records14d = input.executionRecords.filter(
    (record) => record.executedAt >= lookbackThreshold,
  );
  const executed14d = records14d.filter(
    (record) => record.status === 'executed',
  ).length;
  const violated14d = records14d.filter(
    (record) => record.status === 'violated',
  ).length;
  const tracked14d = executed14d + violated14d;

  const strictNodeCount = input.nodes.filter(
    (node) => (node.stabilityPhase ?? 'E0') !== 'E0',
  ).length;
  const passiveCount = input.nodes.filter((node) => node.isPassive).length;
  const reinforcedCount = input.nodes.filter(
    (node) => (node.reinforcementLevel ?? 0) > 0,
  ).length;

  const summary: RSIPInsightSummary = {
    activeNodeCount: input.nodes.length,
    strictNodeCount,
    passiveNodeRatio:
      input.nodes.length > 0 ? round(passiveCount / input.nodes.length) : 0,
    reinforcementCoverage:
      input.nodes.length > 0 ? round(reinforcedCount / input.nodes.length) : 0,
    policyLibrarySize: input.policyLibrary.length,
    runCount: input.runHistory.length,
    linkCount: input.taskLinks.filter((link) => link.isActive).length,
    executionCount14d: executed14d,
    violationCount14d: violated14d,
    successRate14d: tracked14d > 0 ? round(executed14d / tracked14d) : null,
  };

  const sortedRuns = [...input.runHistory].sort(
    (a, b) => a.runNumber - b.runNumber,
  );
  const maxNodeSeries = sortedRuns.map((run) => run.maxNodeCount);
  const durationSeries = sortedRuns.map((run) => run.durationDays);
  const collapseFrequency14d = sortedRuns.filter(
    (run) => run.endedAt && run.endedAt >= lookbackThreshold,
  ).length;
  const trends: RSIPTrendSnapshot = {
    maxNodeTrend: toDirection(maxNodeSeries),
    runDurationTrend: toDirection(durationSeries),
    collapseFrequency14d,
    averageMaxNodeCount: round(average(maxNodeSeries)),
    averageRunDurationDays: round(average(durationSeries)),
  };

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

  const riskNodes = input.nodes
    .map((node) => {
      const phaseWeight =
        node.stabilityPhase === 'E2' ? 3 : node.stabilityPhase === 'E1' ? 2 : 1;
      const reinforcementMultiplier =
        (node.reinforcementLevel ?? 0) > 0 ? 0.3 : 1;
      const failureCost = round(
        (getDescendantCount(input.nodes, node.id) + 1) *
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
