import type { Language } from '../../../i18n';

function pluralizeEn(count: number, singular: string, plural = `${singular}s`) {
  return count === 1 ? singular : plural;
}

export function formatDeletedTime(params: {
  deletedAt: Date;
  language: Language;
  tr: (zh: string, en: string) => string;
}): string {
  const { deletedAt, language, tr } = params;

  const now = new Date();
  const diffMs = now.getTime() - deletedAt.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffDays > 0) {
    return language === 'zh'
      ? `${diffDays}天前`
      : `${diffDays} ${pluralizeEn(diffDays, 'day')} ago`;
  }
  if (diffHours > 0) {
    return language === 'zh'
      ? `${diffHours}小时前`
      : `${diffHours} ${pluralizeEn(diffHours, 'hour')} ago`;
  }
  if (diffMinutes > 0) {
    return language === 'zh'
      ? `${diffMinutes}分钟前`
      : `${diffMinutes} min ago`;
  }

  return tr('刚刚', 'just now');
}
