import { useMemo } from 'react';
import type {
  RSIPExecutionRecord,
  RSIPLibraryEntry,
  RSIPNode,
  RSIPNodeGroup,
  RSIPRunRecord,
  RSIPTaskLink,
} from '../../types';
import { useI18n } from '../../i18n';
import { buildRSIPInsights } from '../../services/rsip-insights/RSIPInsightsService';

interface RSIPInsightsPanelProps {
  nodes: RSIPNode[];
  runHistory: RSIPRunRecord[];
  executionRecords: RSIPExecutionRecord[];
  groups: RSIPNodeGroup[];
  taskLinks: RSIPTaskLink[];
  policyLibrary: RSIPLibraryEntry[];
}

function priorityClass(priority: 'high' | 'medium' | 'low'): string {
  if (priority === 'high') {
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
  }
  if (priority === 'medium') {
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
  }
  return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
}

export function RSIPInsightsPanel({
  nodes,
  runHistory,
  executionRecords,
  groups,
  taskLinks,
  policyLibrary,
}: RSIPInsightsPanelProps) {
  const { language, tr } = useI18n();

  const toPercent = (value: number | null): string => {
    if (value == null) return tr('无数据', 'N/A');
    return `${Math.round(value * 100)}%`;
  };

  const trendLabel = (
    value: 'up' | 'down' | 'flat' | 'insufficient_data',
  ): string => {
    if (value === 'up') return tr('上升', 'Up');
    if (value === 'down') return tr('下降', 'Down');
    if (value === 'flat') return tr('持平', 'Flat');
    return tr('数据不足', 'Insufficient data');
  };

  const priorityLabel = (value: 'high' | 'medium' | 'low'): string => {
    if (value === 'high') return tr('高', 'High');
    if (value === 'medium') return tr('中', 'Medium');
    return tr('低', 'Low');
  };

  const insights = useMemo(
    () =>
      buildRSIPInsights({
        nodes,
        runHistory,
        executionRecords,
        groups,
        taskLinks,
        policyLibrary,
        locale: language,
      }),
    [
      executionRecords,
      groups,
      language,
      nodes,
      policyLibrary,
      runHistory,
      taskLinks,
    ],
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="bento-card">
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400">
            {tr('活跃国策数', 'Active Policies')}
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-slate-100">
            {insights.summary.activeNodeCount}
          </p>
        </div>
        <div className="bento-card">
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400">
            {tr('近14天成功率', '14d Success Rate')}
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-slate-100">
            {toPercent(insights.summary.successRate14d)}
          </p>
        </div>
        <div className="bento-card">
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400">
            {tr('被动覆盖率', 'Passive Coverage')}
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-slate-100">
            {toPercent(insights.summary.passiveNodeRatio)}
          </p>
        </div>
        <div className="bento-card">
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400">
            {tr('强化覆盖率', 'Reinforcement Coverage')}
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-slate-100">
            {toPercent(insights.summary.reinforcementCoverage)}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="bento-card">
          <p className="text-sm text-gray-500 dark:text-slate-400">
            {tr('节点规模趋势', 'Max-node trend')}
          </p>
          <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-slate-100">
            {trendLabel(insights.trends.maxNodeTrend)}
          </p>
        </div>
        <div className="bento-card">
          <p className="text-sm text-gray-500 dark:text-slate-400">
            {tr('轮次时长趋势', 'Run-duration trend')}
          </p>
          <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-slate-100">
            {trendLabel(insights.trends.runDurationTrend)}
          </p>
        </div>
        <div className="bento-card">
          <p className="text-sm text-gray-500 dark:text-slate-400">
            {tr('近14天崩溃次数', 'Collapses in 14 days')}
          </p>
          <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-slate-100">
            {insights.trends.collapseFrequency14d}
          </p>
        </div>
      </div>

      <div className="bento-card space-y-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
          {tr('农村包围城市候选队列', 'Rural-first candidate queue')}
        </h3>
        {insights.ruralFirstCandidates.length === 0 ? (
          <p className="text-sm text-gray-600 dark:text-slate-300">
            {tr(
              '暂未检测到低成本候选。',
              'No low-cost candidates detected yet.',
            )}
          </p>
        ) : (
          <div className="space-y-2">
            {insights.ruralFirstCandidates.slice(0, 5).map((node) => (
              <div
                key={node.nodeId}
                className="rounded-xl border border-gray-200 bg-white/70 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/40"
              >
                <p className="font-medium text-gray-900 dark:text-slate-100">
                  {node.title}
                </p>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  {tr('失败成本', 'Failure cost')} {node.failureCost} |{' '}
                  {tr('违约率', 'Violation rate')}{' '}
                  {toPercent(node.violationRate)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
          {tr('推荐助手', 'Recommendation assistant')}
        </h3>
        {insights.recommendations.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-600 dark:border-slate-700 dark:text-slate-300">
            {tr(
              '暂时没有建议，继续执行以积累更多信号。',
              'No recommendation yet. Continue execution to collect more signal.',
            )}
          </div>
        ) : (
          insights.recommendations.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-gray-200 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-900/60"
            >
              <div className="mb-2 flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${priorityClass(item.priority)}`}
                >
                  {priorityLabel(item.priority)}
                </span>
                <h4 className="text-base font-semibold text-gray-900 dark:text-slate-100">
                  {item.title}
                </h4>
              </div>
              <p className="mb-3 text-sm text-gray-600 dark:text-slate-300">
                {item.rationale}
              </p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700 dark:text-slate-200">
                {item.actions.map((action) => (
                  <li key={action}>{action}</li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
