import React from 'react';
import { Chain } from '../types';
import { getGroupTimeStatus, startGroupTimer, isGroupExpired } from '../utils/timeLimit';
import { isDev } from '../utils/env';
import { logger } from '../utils/logger';
import { useI18n } from '../i18n';

interface TimeLimitTestProps {
  group: Chain;
}

export const TimeLimitTest: React.FC<TimeLimitTestProps> = ({ group }) => {
  const { language, locale, tr } = useI18n();
  const timeStatus = getGroupTimeStatus(group, language);
  
  const handleStartTimer = () => {
    const updatedGroup = startGroupTimer(group);
    if (isDev) {
      logger.debug('TIME_LIMIT_TEST', '启动计时器', { updatedGroup });
    }
  };

  const handleCheckExpired = () => {
    const expired = isGroupExpired(group);
    if (isDev) {
      logger.debug('TIME_LIMIT_TEST', '是否过期', { expired });
    }
  };

  return (
    <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl">
      <h3 className="text-lg font-bold font-chinese mb-4">{tr('时间限定测试', 'Time Limit Test')}</h3>
      
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 dark:text-slate-400">
            {tr('任务群', 'Group')}: {group.name}
          </p>
          <p className="text-sm text-gray-600 dark:text-slate-400">
            {tr('时间限制', 'Time limit')}:{' '}
            {group.timeLimitHours ? (
              <>
                {group.timeLimitHours} {tr('小时', 'hours')}
              </>
            ) : (
              tr('无时间限制', 'No time limit')
            )}
          </p>
          <p className="text-sm text-gray-600 dark:text-slate-400">
            {tr('开始时间', 'Start')}: {group.groupStartedAt ? group.groupStartedAt.toLocaleString(locale) : tr('未开始', 'Not started')}
          </p>
          <p className="text-sm text-gray-600 dark:text-slate-400">
            {tr('过期时间', 'Expires')}: {group.groupExpiresAt ? group.groupExpiresAt.toLocaleString(locale) : tr('未设置', 'Not set')}
          </p>
        </div>

        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm font-chinese">
            {tr('状态', 'Status')}: {timeStatus.formattedTime}
          </p>
          <p className="text-sm font-chinese">
            {tr('进度', 'Progress')}: {Math.round(timeStatus.progress * 100)}%
          </p>
          <p className="text-sm font-chinese">
            {tr('是否过期', 'Expired')}: {timeStatus.isExpired ? tr('是', 'Yes') : tr('否', 'No')}
          </p>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={handleStartTimer}
            className="px-3 py-2 bg-blue-500 text-white rounded-lg text-sm font-chinese"
          >
            {tr('启动计时器', 'Start timer')}
          </button>
          <button
            onClick={handleCheckExpired}
            className="px-3 py-2 bg-orange-500 text-white rounded-lg text-sm font-chinese"
          >
            {tr('检查过期', 'Check expired')}
          </button>
        </div>
      </div>
    </div>
  );
};
