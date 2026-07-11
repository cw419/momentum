import type {
  RecommendationContext,
  RSIPRecommendation,
} from './rsipInsightsTypes';
import { joinList, localize } from './rsipLocalization';
import {
  buildRuralFirstRecommendation,
  buildSplitRecommendation,
} from './rsipHighRiskRecommenders';

function buildGroupingRecommendation(
  context: RecommendationContext,
): RSIPRecommendation | null {
  const ungroupedNodes = context.input.nodes.filter(
    (node) => !node.groupId,
  ).length;
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
    (context.summary.successRate14d != null &&
      context.summary.successRate14d < 0.6)
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

export function buildRecommendations(
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
