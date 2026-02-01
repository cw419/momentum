type Tr = (zh: string, en: string) => string;

export function formatLastUsed(date: Date, language: string, tr: Tr): string {
  const now = new Date();
  const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

  if (diffHours < 1) return tr('刚刚', 'Just now');
  if (diffHours < 24) return language === 'zh' ? `${diffHours}小时前` : `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return tr('昨天', 'Yesterday');
  if (diffDays < 7) return language === 'zh' ? `${diffDays}天前` : `${diffDays}d ago`;
  const weeks = Math.floor(diffDays / 7);
  return language === 'zh' ? `${weeks}周前` : `${weeks}w ago`;
}

export function getMatchTypeLabel(matchType: string, tr: Tr): string {
  switch (matchType) {
    case 'prefix':
      return tr('前缀匹配', 'Prefix match');
    case 'contains':
      return tr('包含匹配', 'Contains match');
    case 'fuzzy':
      return tr('模糊匹配', 'Fuzzy match');
    default:
      return '';
  }
}

