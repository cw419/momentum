import { CheckCircle, Flame, Gift, Star } from 'lucide-react';

type TranslateFn = (zh: string, en: string) => string;

type CheckinStatsSummary = {
  total_points: number;
  total_checkins: number;
  current_streak: number;
};

export function DailyCheckinStatsGrid({
  stats,
  tr,
}: {
  stats: CheckinStatsSummary;
  tr: TranslateFn;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
      {/* 总积分 */}
      <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 font-medium">
              {tr('总积分', 'Total points')}
            </p>
            <p className="text-2xl font-bold text-yellow-800 dark:text-yellow-200">
              {stats.total_points}
            </p>
          </div>
          <Star className="w-8 h-8 text-yellow-500" />
        </div>
      </div>

      {/* 连续签到天数 */}
      <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-red-700 dark:text-red-300 font-medium">
              {tr('连续天数', 'Streak')}
            </p>
            <p className="text-2xl font-bold text-red-800 dark:text-red-200">
              {stats.current_streak}
            </p>
          </div>
          <Flame className="w-8 h-8 text-red-500" />
        </div>
      </div>

      {/* 总签到次数 */}
      <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-4 col-span-2 md:col-span-1">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-green-700 dark:text-green-300 font-medium">
              {tr('总签到', 'Total check-ins')}
            </p>
            <p className="text-2xl font-bold text-green-800 dark:text-green-200">
              {stats.total_checkins}
            </p>
          </div>
          <Gift className="w-8 h-8 text-green-500" />
        </div>
      </div>
    </div>
  );
}

export function DailyCheckinCheckedInState({ tr }: { tr: TranslateFn }) {
  return (
    <div className="text-center py-4">
      <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-3" />
      <p className="text-lg font-semibold text-green-700 dark:text-green-300">
        {tr('今天已签到', 'Checked in today')}
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
        {tr('明天再来获取更多积分吧！', 'Come back tomorrow for more points!')}
      </p>
    </div>
  );
}
