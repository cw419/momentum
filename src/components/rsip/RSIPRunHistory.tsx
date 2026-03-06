import { useMemo } from 'react';
import type { RSIPRunRecord } from '../../types';
import { useI18n } from '../../i18n';

interface RSIPRunHistoryProps {
  records: RSIPRunRecord[];
}

export function RSIPRunHistory({ records }: RSIPRunHistoryProps) {
  const { language, tr } = useI18n();

  const sorted = useMemo(
    () => [...records].sort((a, b) => b.runNumber - a.runNumber),
    [records],
  );

  const stats = useMemo(() => {
    if (sorted.length === 0) {
      return {
        totalRuns: 0,
        longestDuration: 0,
        averageMaxNodeCount: 0,
      };
    }
    const longestDuration = Math.max(
      ...sorted.map((item) => item.durationDays),
    );
    const averageMaxNodeCount =
      sorted.reduce((sum, item) => sum + item.maxNodeCount, 0) / sorted.length;
    return {
      totalRuns: sorted.length,
      longestDuration,
      averageMaxNodeCount: Math.round(averageMaxNodeCount * 10) / 10,
    };
  }, [sorted]);

  const dateLocale = language.startsWith('zh') ? 'zh-CN' : 'en-US';

  if (sorted.length === 0) {
    return (
      <div className="bento-card">
        <h2 className="mb-2 text-xl font-bold text-gray-900 dark:text-slate-100">
          {tr('轮次历史', 'Run History')}
        </h2>
        <p className="text-sm text-gray-600 dark:text-slate-300">
          {tr(
            '暂无崩溃轮次记录。出现重大回滚后会在这里沉淀历史数据。',
            'No collapse records yet. Significant rollbacks will be recorded here.',
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="bento-card">
          <p className="text-sm text-gray-500 dark:text-slate-400">
            {tr('总轮次', 'Total runs')}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
            {stats.totalRuns}
          </p>
        </div>
        <div className="bento-card">
          <p className="text-sm text-gray-500 dark:text-slate-400">
            {tr('最长持续', 'Longest duration')}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
            {language.startsWith('zh')
              ? `${stats.longestDuration} 天`
              : `${stats.longestDuration} days`}
          </p>
        </div>
        <div className="bento-card">
          <p className="text-sm text-gray-500 dark:text-slate-400">
            {tr('平均峰值节点', 'Avg. peak nodes')}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
            {stats.averageMaxNodeCount}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {sorted.map((record) => (
          <div
            key={`${record.runNumber}-${record.startedAt.getTime()}`}
            className="rounded-2xl border border-gray-200 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-900/60"
          >
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-slate-100">
                {language.startsWith('zh')
                  ? `第 ${record.runNumber} 轮`
                  : `Run #${record.runNumber}`}
              </h3>
              <span className="text-xs text-gray-500 dark:text-slate-400">
                {record.startedAt.toLocaleDateString(dateLocale)} -{' '}
                {record.endedAt?.toLocaleDateString(dateLocale) ??
                  tr('进行中', 'In progress')}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-slate-300">
              {language.startsWith('zh')
                ? `持续 ${record.durationDays} 天 · 峰值节点 ${record.maxNodeCount}`
                : `Duration ${record.durationDays} days · Peak nodes ${record.maxNodeCount}`}
            </p>
            {record.collapseReason && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-300">
                {tr('崩溃原因：', 'Collapse reason:')}
                {record.collapseReason}
                {record.collapseNodeTitle
                  ? language.startsWith('zh')
                    ? `（${record.collapseNodeTitle}）`
                    : ` (${record.collapseNodeTitle})`
                  : ''}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
