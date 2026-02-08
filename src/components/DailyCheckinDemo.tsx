import React, { useState } from 'react';
import { Gift, Calendar, Loader2, AlertCircle } from 'lucide-react';
import { useI18n } from '../i18n';
import {
  DailyCheckinCheckedInState,
  DailyCheckinStatsGrid,
} from './daily-checkin/DailyCheckinShared';

interface DailyCheckinDemoProps {
  className?: string;
}

export const DailyCheckinDemo: React.FC<DailyCheckinDemoProps> = ({
  className = '',
}) => {
  const { tr } = useI18n();
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [stats, setStats] = useState({
    total_points: 120,
    total_checkins: 12,
    current_streak: 5,
    longest_streak: 8,
    has_checked_in_today: false,
  });

  const handleCheckin = async () => {
    setIsCheckingIn(true);
    // 模拟签到过程
    setTimeout(() => {
      setStats((prev) => ({
        ...prev,
        total_points: prev.total_points + 10,
        total_checkins: prev.total_checkins + 1,
        current_streak: prev.current_streak + 1,
        has_checked_in_today: true,
      }));
      setHasCheckedIn(true);
      setIsCheckingIn(false);
    }, 1500);
  };

  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800 ${className}`}
    >
      {/* 演示标签 */}
      <div className="mb-4 text-center">
        <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
          {tr('🚀 演示模式', '🚀 Demo mode')}
        </span>
      </div>

      {/* 标题 */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="flex items-center text-xl font-semibold text-gray-900 dark:text-gray-100">
          <Calendar className="mr-2 h-5 w-5 text-primary-500" />
          {tr('每日签到', 'Daily Check-in')}
        </h2>
        <button
          className="p-1 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
          title={tr('刷新数据', 'Refresh')}
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>

      {/* 统计信息 */}
      <DailyCheckinStatsGrid stats={stats} tr={tr} />

      {/* 签到按钮 */}
      <div className="space-y-4">
        {stats.has_checked_in_today || hasCheckedIn ? (
          <DailyCheckinCheckedInState tr={tr} />
        ) : (
          <button
            onClick={handleCheckin}
            disabled={isCheckingIn}
            className={`w-full rounded-xl px-6 py-4 text-lg font-semibold transition duration-200 ${
              isCheckingIn
                ? 'cursor-not-allowed bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                : 'transform bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg hover:scale-105 hover:from-blue-600 hover:to-purple-700 hover:shadow-xl'
            } `}
          >
            <div className="flex items-center justify-center space-x-2">
              {isCheckingIn ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span>{tr('签到中...', 'Checking in...')}</span>
                </>
              ) : (
                <>
                  <Gift className="h-6 w-6" />
                  <span>
                    {tr('每日签到 +10 积分', 'Daily check-in +10 points')}
                  </span>
                </>
              )}
            </div>
          </button>
        )}

        {/* 说明文字 */}
        <div className="text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {tr(
              '每日签到获得 10 积分，连续签到获得更多奖励',
              'Check in daily to earn 10 points. Streaks earn more rewards.',
            )}
          </p>
        </div>
      </div>

      {/* 演示说明 */}
      <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
        <div className="flex items-start space-x-3">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-500" />
          <div>
            <p className="mb-1 text-sm font-medium text-blue-800 dark:text-blue-200">
              {tr('演示模式说明', 'Demo notes')}
            </p>
            <p className="text-xs leading-relaxed text-blue-600 dark:text-blue-300">
              {tr(
                '这是签到功能的演示版本。要使用真实功能，请配置 Supabase 环境变量并运行数据库迁移。配置完成后，此演示版本将被正式版本自动替换。',
                'This is a demo version of Daily Check-in. To use the real feature, configure Supabase env vars and run the database migrations. Once configured, this demo will be replaced automatically.',
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
