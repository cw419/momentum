export interface SplitDraftItem {
  id: string;
  title: string;
  rule: string;
  isPassive: boolean;
}

export function getSplitTemplates(
  language: string,
): Record<string, { goal: string; items: SplitDraftItem[] }> {
  const isZh = language.startsWith('zh');

  return {
    sleep: {
      goal: isZh ? '早睡早起' : 'Sleep early and wake early',
      items: [
        {
          id: 'sleep-1',
          title: isZh ? '23:00 前入睡' : 'Sleep before 23:00',
          rule: isZh
            ? '22:45 开始睡前流程，23:00 前上床。'
            : 'Start wind-down at 22:45 and be in bed before 23:00.',
          isPassive: false,
        },
        {
          id: 'sleep-2',
          title: isZh ? '睡前断屏' : 'No-screen before sleep',
          rule: isZh
            ? '22:30 后手机仅保留闹钟功能。'
            : 'After 22:30, keep phone only for alarm use.',
          isPassive: true,
        },
      ],
    },
    exercise: {
      goal: isZh ? '稳定运动' : 'Stable exercise habit',
      items: [
        {
          id: 'exercise-1',
          title: isZh ? '回家立刻换运动服' : 'Change into workout clothes',
          rule: isZh
            ? '下班到家 10 分钟内换好运动服。'
            : 'Change into workout clothes within 10 minutes after getting home.',
          isPassive: false,
        },
        {
          id: 'exercise-2',
          title: isZh ? '最低运动量' : 'Minimum exercise dose',
          rule: isZh
            ? '每天至少完成 10 分钟步行或拉伸。'
            : 'Complete at least 10 minutes of walking or stretching daily.',
          isPassive: false,
        },
      ],
    },
    diet: {
      goal: isZh ? '饮食控制' : 'Diet control',
      items: [
        {
          id: 'diet-1',
          title: isZh ? '提前备餐' : 'Prep meals in advance',
          rule: isZh
            ? '工作日晚间准备次日午餐。'
            : 'Prepare next-day lunch during weekday evenings.',
          isPassive: true,
        },
        {
          id: 'diet-2',
          title: isZh ? '晚间零食拦截' : 'Night snack cutoff',
          rule: isZh
            ? '21:00 后不摄入高糖零食。'
            : 'No high-sugar snacks after 21:00.',
          isPassive: false,
        },
      ],
    },
  };
}
