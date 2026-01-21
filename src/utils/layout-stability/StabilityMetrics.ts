/**
 * 布局稳定性指标收集
 */

import type { LayoutIssue, StabilityReport } from './StabilityTypes';

export class StabilityMetrics {
  private cumulativeLayoutShift = 0;
  private layoutIssues: LayoutIssue[] = [];

  getCumulativeLayoutShift(): number {
    return this.cumulativeLayoutShift;
  }

  addLayoutShift(value: number): void {
    this.cumulativeLayoutShift += value;
  }

  getIssues(): LayoutIssue[] {
    return this.layoutIssues;
  }

  addIssue(issue: LayoutIssue): void {
    this.layoutIssues.push(issue);
  }

  clearIssues(): void {
    this.layoutIssues = [];
    this.cumulativeLayoutShift = 0;
  }

  getStabilityReport(): StabilityReport {
    return {
      cumulativeLayoutShift: this.cumulativeLayoutShift,
      totalIssues: this.layoutIssues.length,
      issuesByType: this.groupIssuesByType(),
      issuesBySeverity: this.groupIssuesBySeverity(),
      recommendations: this.getRecommendations()
    };
  }

  private groupIssuesByType(): Record<string, number> {
    return this.layoutIssues.reduce((acc, issue) => {
      acc[issue.type] = (acc[issue.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private groupIssuesBySeverity(): Record<string, number> {
    return this.layoutIssues.reduce((acc, issue) => {
      acc[issue.severity] = (acc[issue.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private getRecommendations(): string[] {
    const recommendations: string[] = [];

    if (this.cumulativeLayoutShift > 0.1) {
      recommendations.push('布局偏移过大，建议优化动态内容加载');
    }

    const overflowIssues = this.layoutIssues.filter(i => i.type === 'horizontal-overflow');
    if (overflowIssues.length > 0) {
      recommendations.push('存在横向溢出问题，建议检查容器宽度设置');
    }

    const stabilityIssues = this.layoutIssues.filter(i => i.type === 'unstable-width');
    if (stabilityIssues.length > 0) {
      recommendations.push('存在宽度不稳定元素，建议设置明确的尺寸');
    }

    return recommendations;
  }
}
