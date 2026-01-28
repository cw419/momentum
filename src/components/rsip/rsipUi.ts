export const rsipTypeEmojiMap: Record<string, string> = {
  policy: '📝',
  habit: '🔄',
  reward: '🌟',
  penalty: '❌',
  ritual: '🧘',
  goal: '🏁',
  trigger: '➡️',
  reminder: '⏰',
};

const rsipTypeLabelMap: Record<string, { zh: string; en: string }> = {
  policy: { zh: '国策', en: 'Policy' },
  habit: { zh: '习惯', en: 'Habit' },
  reward: { zh: '奖励', en: 'Reward' },
  penalty: { zh: '惩罚', en: 'Penalty' },
  ritual: { zh: '仪式', en: 'Ritual' },
  goal: { zh: '目标', en: 'Goal' },
  trigger: { zh: '触发器', en: 'Trigger' },
  reminder: { zh: '提醒', en: 'Reminder' },
};

export function getRsipTypeLabel(language: string, type: string): string {
  const label = rsipTypeLabelMap[type];
  if (!label) return type;
  return language === 'zh' ? label.zh : label.en;
}

export const rsipTypeColorMap: Record<
  string,
  {
    badge: string;
    ring: string;
    bg: string;
    border: string;
  }
> = {
  policy: {
    badge: 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200',
    ring: 'ring-gray-400 dark:ring-gray-500',
    bg: 'bg-gray-100 dark:bg-slate-800',
    border: 'border-gray-300 dark:border-slate-600',
  },
  habit: {
    badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200',
    ring: 'ring-blue-400 dark:ring-blue-600',
    bg: 'bg-blue-100 dark:bg-blue-900/40',
    border: 'border-blue-300 dark:border-blue-700',
  },
  reward: {
    badge: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200',
    ring: 'ring-yellow-400 dark:ring-yellow-600',
    bg: 'bg-yellow-100 dark:bg-yellow-900/40',
    border: 'border-yellow-300 dark:border-yellow-700',
  },
  penalty: {
    badge: 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200',
    ring: 'ring-red-400 dark:ring-red-600',
    bg: 'bg-red-100 dark:bg-red-900/40',
    border: 'border-red-300 dark:border-red-700',
  },
  ritual: {
    badge: 'bg-pink-100 dark:bg-pink-900/20 text-pink-700 dark:text-pink-200',
    ring: 'ring-pink-400 dark:ring-pink-600',
    bg: 'bg-pink-100 dark:bg-pink-900/40',
    border: 'border-pink-300 dark:border-pink-700',
  },
  goal: {
    badge: 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-200',
    ring: 'ring-emerald-400 dark:ring-emerald-600',
    bg: 'bg-emerald-100 dark:bg-emerald-900/40',
    border: 'border-emerald-300 dark:border-emerald-700',
  },
  trigger: {
    badge: 'bg-indigo-100 dark:bg-indigo-900/20 text-indigo-800 dark:text-indigo-200',
    ring: 'ring-indigo-400 dark:ring-indigo-600',
    bg: 'bg-indigo-100 dark:bg-indigo-900/40',
    border: 'border-indigo-300 dark:border-indigo-700',
  },
  reminder: {
    badge: 'bg-violet-100 dark:bg-violet-900/20 text-violet-800 dark:text-violet-200',
    ring: 'ring-violet-400 dark:ring-violet-600',
    bg: 'bg-violet-100 dark:bg-violet-900/40',
    border: 'border-violet-300 dark:border-violet-700',
  },
};
