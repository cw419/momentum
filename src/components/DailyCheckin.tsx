import React from 'react';
import { CheckCircle, Gift, Calendar, Flame, Star, Loader2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useCheckinDomain } from '../hooks/domains/useCheckinDomain';
import { useI18n } from '../i18n';

interface DailyCheckinProps {
  className?: string;
}

export const DailyCheckin: React.FC<DailyCheckinProps> = ({ className = '' }) => {
  const { tr } = useI18n();
  const {
    stats,
    isLoading,
    isCheckingIn,
    error,
    successMessage,
    isCollapsed,
    clearError,
    toggleCollapsed,
    loadStats,
    handleCheckin,
  } = useCheckinDomain();


  // 如果正在加载，显示加载状态
  if (isLoading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          <span className="ml-3 text-gray-600 dark:text-gray-300">{tr('加载签到数据...', 'Loading check-in data...')}</span>
        </div>
      </div>
    );
  }

  // 如果有错误且没有数据，显示错误状态
  if (error && !stats) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <AlertCircle className="w-8 h-8 text-red-500" />
          <div className="ml-3">
            <p className="text-red-600 dark:text-red-400 font-medium">{tr('签到功能暂不可用', 'Daily check-in unavailable')}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{error}</p>
            <button
              type="button"
              onClick={loadStats}
              aria-label={tr('重试', 'Retry')}
              className="mt-2 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
            >
              {tr('重试', 'Retry')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
      {/* 标题 */}
      <div className="flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={tr('展开/折叠签到', 'Toggle check-in')}
          aria-expanded={!isCollapsed}
          className="flex items-center text-xl font-semibold text-gray-900 dark:text-gray-100 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
        >
          <Calendar className="w-5 h-5 mr-2 text-primary-500" aria-hidden="true" />
          {tr('每日签到', 'Daily Check-in')}
          {isCollapsed ? (
            <ChevronDown className="w-5 h-5 ml-2 text-gray-500" aria-hidden="true" />
          ) : (
            <ChevronUp className="w-5 h-5 ml-2 text-gray-500" aria-hidden="true" />
          )}
        </button>
        <div className="flex items-center space-x-2">
          {/* 快速状态指示器（折叠时显示） */}
          {isCollapsed && stats && (
            <div className="flex items-center space-x-3 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center">
                <Star className="w-4 h-4 text-yellow-500 mr-1" />
                {stats.total_points}
              </div>
              {stats.has_checked_in_today ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              )}
            </div>
          )}
          <button
            type="button"
            onClick={loadStats}
            aria-label={tr('刷新数据', 'Refresh')}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            title={tr('刷新数据', 'Refresh')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* 可折叠内容区域 */}
      <div className={`
        transition-[max-height,opacity] duration-300 ease-in-out overflow-hidden
        ${isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[1000px] opacity-100'}
      `}>
        {/* 统计信息 */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          {/* 总积分 */}
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 font-medium">{tr('总积分', 'Total points')}</p>
                <p className="text-2xl font-bold text-yellow-800 dark:text-yellow-200">{stats.total_points}</p>
              </div>
              <Star className="w-8 h-8 text-yellow-500" />
            </div>
          </div>

          {/* 连续签到天数 */}
          <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-700 dark:text-red-300 font-medium">{tr('连续天数', 'Streak')}</p>
                <p className="text-2xl font-bold text-red-800 dark:text-red-200">{stats.current_streak}</p>
              </div>
              <Flame className="w-8 h-8 text-red-500" />
            </div>
          </div>

          {/* 总签到次数 */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-4 col-span-2 md:col-span-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 dark:text-green-300 font-medium">{tr('总签到', 'Total check-ins')}</p>
                <p className="text-2xl font-bold text-green-800 dark:text-green-200">{stats.total_checkins}</p>
              </div>
              <Gift className="w-8 h-8 text-green-500" />
            </div>
          </div>
        </div>
      )}

      {/* 签到按钮 */}
      <div className="space-y-4">
        {stats?.has_checked_in_today ? (
          <div className="text-center py-4">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-3" />
            <p className="text-lg font-semibold text-green-700 dark:text-green-300">{tr('今天已签到', 'Checked in today')}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {tr('明天再来获取更多积分吧！', 'Come back tomorrow for more points!')}
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleCheckin}
            disabled={isCheckingIn}
            aria-label={tr('立即签到', 'Check in now')}
            className={`
              w-full py-4 px-6 rounded-xl font-semibold text-lg transition duration-200
              ${isCheckingIn
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]'
              }
            `}
          >
            {isCheckingIn ? (
              <div className="flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin mr-3" aria-hidden="true" />
                {tr('签到中...', 'Checking in...')}
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <Gift className="w-6 h-6 mr-3" aria-hidden="true" />
                {tr('立即签到', 'Check in now')}
              </div>
            )}
          </button>
        )}

        {/* 成功消息 */}
        {successMessage && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
              <p className="text-green-700 dark:text-green-300 font-medium">{successMessage}</p>
            </div>
          </div>
        )}

        {/* 错误消息 */}
        {error && stats && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-500 mr-3" />
                <p className="text-red-700 dark:text-red-300">{error}</p>
              </div>
              <button
                type="button"
                onClick={clearError}
                aria-label={tr('关闭', 'Close')}
                className="text-red-400 hover:text-red-600 dark:hover:text-red-300"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* 最佳连续记录 */}
        {stats && stats.longest_streak > stats.current_streak && (
          <div className="text-center py-2 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {tr('最佳记录：连续', 'Best streak:')}{' '}
              <span className="font-semibold text-gray-700 dark:text-gray-300">{stats.longest_streak}</span>{' '}
              {tr('天', 'days')}
            </p>
          </div>
        )}
      </div>
      </div>
      {/* 折叠内容区域结束 */}
    </div>
  );
};
