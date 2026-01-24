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
    <div className="mb-4 p-4 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/20 rounded-xl">
            <Bell className="text-amber-400" size={20} />
          </div>
          <div>
            <p className="font-medium text-amber-200">今日尚未查看国策树</p>
            <p className="text-sm text-amber-300/70">
              连续 {treeOpenStreak} 天打卡
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRecordOpened}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-medium rounded-xl transition-all cursor-pointer"
        >
          立即打卡
        </button>
      </div>
    </div>
  );
}
