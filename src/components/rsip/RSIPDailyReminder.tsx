import { Bell } from 'lucide-react';

interface RSIPDailyReminderProps {
  hasOpenedToday: boolean;
  treeOpenStreak: number;
  onRecordOpened: () => void;
}

export function RSIPDailyReminder({
  hasOpenedToday,
  treeOpenStreak,
  onRecordOpened,
}: RSIPDailyReminderProps) {
  if (hasOpenedToday) {
    return null;
  }

  return (
    <div className="mb-4 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/20 to-orange-500/20 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-amber-500/20 p-2">
            <Bell className="text-amber-400" size={20} />
          </div>
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-200">
              今日尚未查看国策树
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300/70">
              连续 {treeOpenStreak} 天打卡
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRecordOpened}
          className="cursor-pointer rounded-xl bg-amber-500 px-4 py-2 font-medium text-black transition hover:bg-amber-400"
        >
          立即打卡
        </button>
      </div>
    </div>
  );
}
