import type {
  RecommendationContext,
  RSIPInsightsLocale,
  RSIPRecommendation,
} from './rsipInsightsTypes';
import { joinList, localize } from './rsipLocalization';

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

export function buildRuralFirstRecommendation(
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

export function buildSplitRecommendation(
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
