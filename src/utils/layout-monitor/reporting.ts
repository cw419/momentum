import type { LayoutIssue } from './types';

export function groupIssuesByType(
  issues: LayoutIssue[],
): Record<string, number> {
  return issues.reduce(
    (acc, issue) => {
      acc[issue.type] = (acc[issue.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
}

export function groupIssuesBySeverity(
  issues: LayoutIssue[],
): Record<string, number> {
  return issues.reduce(
    (acc, issue) => {
      acc[issue.severity] = (acc[issue.severity] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
}

export function getRecommendations(
  cumulativeLayoutShift: number,
  issues: LayoutIssue[],
): string[] {
  const recommendations: string[] = [];

  if (cumulativeLayoutShift > 0.1) {
    recommendations.push('布局偏移过大，建议优化动态内容加载');
  }

  const overflowIssues = issues.filter((i) => i.type === 'horizontal-overflow');
  if (overflowIssues.length > 0) {
    recommendations.push('存在横向溢出问题，建议检查容器宽度设置');
  }

  const stabilityIssues = issues.filter((i) => i.type === 'unstable-width');
  if (stabilityIssues.length > 0) {
    recommendations.push('存在宽度不稳定元素，建议设置明确的尺寸');
  }

  return recommendations;
}
