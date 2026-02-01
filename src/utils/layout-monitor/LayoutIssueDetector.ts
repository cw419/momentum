import { isDev } from '../env';
import { logger } from '../logger';

export function describeElement(element: HTMLElement): { tagName: string; id?: string; className?: string } {
  const className = typeof element.className === 'string' ? element.className : String(element.className);
  return {
    tagName: element.tagName,
    id: element.id || undefined,
    className: className || undefined,
  };
}

export interface LayoutIssue {
  type: 'horizontal-overflow' | 'layout-shift' | 'unstable-width';
  element: HTMLElement;
  severity: 'low' | 'medium' | 'high';
  description: string;
  suggestedFix?: string;
}

export class LayoutIssueDetector {
  private cumulativeLayoutShift = 0;
  private layoutIssues: LayoutIssue[] = [];
  private readonly autoFix: boolean;

  constructor(autoFix = true) {
    this.autoFix = autoFix;
  }

  handleLayoutShift(entry: LayoutShift): void {
    if (entry.hadRecentInput) return;

    this.cumulativeLayoutShift += entry.value;

    if (entry.value > 0.1) {
      const issue: LayoutIssue = {
        type: 'layout-shift',
        element: document.body,
        severity: entry.value > 0.25 ? 'high' : 'medium',
        description: `检测到布局偏移: ${entry.value.toFixed(4)}`,
        suggestedFix: '检查是否有未设置尺寸的图片或动态内容'
      };

      this.layoutIssues.push(issue);

      if (isDev) {
        logger.warn('LAYOUT', '🚨 布局偏移', {
          issue: {
            type: issue.type,
            severity: issue.severity,
            description: issue.description,
            suggestedFix: issue.suggestedFix,
            element: describeElement(issue.element),
          },
        });
      }

      if (this.autoFix) {
        this.attemptAutoFix(issue);
      }
    }
  }

  performInitialCheck(container: HTMLElement): void {
    this.checkHorizontalOverflow(container);

    const elements = container.querySelectorAll('*');
    elements.forEach(element => {
      this.checkElement(element as HTMLElement);
    });
  }

  checkElement(element: HTMLElement): void {
    if (element.scrollWidth > element.clientWidth) {
      const issue: LayoutIssue = {
        type: 'horizontal-overflow',
        element,
        severity: 'medium',
        description: `元素 ${element.tagName} 存在横向溢出`,
        suggestedFix: '添加 overflow-x: hidden 或调整宽度'
      };

      this.layoutIssues.push(issue);

      if (this.autoFix) {
        this.attemptAutoFix(issue);
      }
    }

    this.checkElementStability(element);
  }

  checkElementStability(element: HTMLElement): void {
    const computedStyle = window.getComputedStyle(element);

    if (computedStyle.width === 'auto' && element.children.length > 0) {
      const hasFlexibleContent = Array.from(element.children).some(child => {
        const childStyle = window.getComputedStyle(child as HTMLElement);
        return childStyle.width === 'auto' || childStyle.flexGrow !== '0';
      });

      if (hasFlexibleContent) {
        const issue: LayoutIssue = {
          type: 'unstable-width',
          element,
          severity: 'low',
          description: `元素 ${element.tagName} 可能存在宽度不稳定`,
          suggestedFix: '考虑设置固定宽度或使用 min-width'
        };

        this.layoutIssues.push(issue);
      }
    }
  }

  checkHorizontalOverflow(container: HTMLElement): void {
    if (container.scrollWidth > container.clientWidth) {
      const issue: LayoutIssue = {
        type: 'horizontal-overflow',
        element: container,
        severity: 'high',
        description: '容器存在横向溢出',
        suggestedFix: '添加 overflow-x: hidden'
      };

      this.layoutIssues.push(issue);

      if (this.autoFix) {
        this.attemptAutoFix(issue);
      }
    }
  }

  applyStabilityFixes(container: HTMLElement): void {
    this.precomputeLayout(container);
    this.fixCommonIssues(container);
  }

  clearIssues(): void {
    this.layoutIssues = [];
    this.cumulativeLayoutShift = 0;
  }

  getStabilityReport(): {
    cumulativeLayoutShift: number;
    totalIssues: number;
    issuesByType: Record<string, number>;
    issuesBySeverity: Record<string, number>;
    recommendations: string[];
  } {
    return {
      cumulativeLayoutShift: this.cumulativeLayoutShift,
      totalIssues: this.layoutIssues.length,
      issuesByType: this.groupIssuesByType(),
      issuesBySeverity: this.groupIssuesBySeverity(),
      recommendations: this.getRecommendations()
    };
  }

  reportIssues(): void {
    if (this.layoutIssues.length === 0) {
      logger.debug('LAYOUT', '✅ 未发现布局问题');
      return;
    }

    const issues = this.layoutIssues.map(issue => ({
      type: issue.type,
      severity: issue.severity,
      description: issue.description,
      suggestedFix: issue.suggestedFix,
      element: describeElement(issue.element),
    }));

    logger.debug('LAYOUT', '📊 布局稳定性报告', {
      cumulativeLayoutShift: Number(this.cumulativeLayoutShift.toFixed(4)),
      totalIssues: this.layoutIssues.length,
      issues,
    });
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

  private attemptAutoFix(issue: LayoutIssue): void {
    switch (issue.type) {
      case 'horizontal-overflow':
        this.fixHorizontalOverflow(issue.element);
        break;
      case 'unstable-width':
        this.fixUnstableWidth(issue.element);
        break;
    }
  }

  private fixHorizontalOverflow(element: HTMLElement): void {
    element.style.overflowX = 'hidden';
    element.style.maxWidth = '100%';
    element.style.boxSizing = 'border-box';

    if (isDev) {
      logger.debug('LAYOUT', '🔧 自动修复横向溢出', { element: describeElement(element) });
    }
  }

  private fixUnstableWidth(element: HTMLElement): void {
    const computedStyle = window.getComputedStyle(element);
    if (computedStyle.width === 'auto') {
      element.style.minWidth = '0';
      element.style.maxWidth = '100%';
    }

    if (isDev) {
      logger.debug('LAYOUT', '🔧 自动修复宽度不稳定', { element: describeElement(element) });
    }
  }

  private precomputeLayout(container: HTMLElement): void {
    const ruleItems = container.querySelectorAll('.rule-item, [data-rule-item]');
    ruleItems.forEach(item => {
      const element = item as HTMLElement;
      if (!element.style.minHeight) {
        element.style.minHeight = '60px';
        element.style.boxSizing = 'border-box';
      }
    });

    const listContainers = container.querySelectorAll('.rule-list, [data-rule-list]');
    listContainers.forEach(list => {
      const element = list as HTMLElement;
      if (!element.style.height && !element.style.maxHeight) {
        element.style.maxHeight = '400px';
        element.style.overflowY = 'auto';
      }
    });

    const tooltips = container.querySelectorAll('.tooltip, [data-tooltip]');
    tooltips.forEach(tooltip => {
      const element = tooltip as HTMLElement;
      if (window.getComputedStyle(element).position !== 'fixed') {
        element.style.position = 'absolute';
        element.style.zIndex = '9999';
      }
    });
  }

  private fixCommonIssues(container: HTMLElement): void {
    this.fixScrollContainers(container);
    this.fixPopoverLayers(container);
    this.fixDynamicContent(container);
  }

  private fixScrollContainers(container: HTMLElement): void {
    const scrollContainers = container.querySelectorAll('[data-scroll-container]');
    scrollContainers.forEach(scrollContainer => {
      const element = scrollContainer as HTMLElement;

      if (!element.style.height && !element.style.maxHeight) {
        element.style.maxHeight = '400px';
      }

      element.style.overflowY = 'auto';
      element.style.overscrollBehavior = 'contain';
      element.style.scrollBehavior = 'smooth';
      element.style.willChange = 'scroll-position';
    });
  }

  private fixPopoverLayers(container: HTMLElement): void {
    const popovers = container.querySelectorAll('[data-popover], .popover, .tooltip');
    popovers.forEach(popover => {
      const element = popover as HTMLElement;

      element.style.transform = element.style.transform || 'translateZ(0)';
      element.style.backfaceVisibility = 'hidden';

      if (window.getComputedStyle(element).position === 'static') {
        element.style.position = 'absolute';
      }
    });
  }

  private fixDynamicContent(container: HTMLElement): void {
    const dynamicContainers = container.querySelectorAll('[data-dynamic-content]');
    dynamicContainers.forEach(dynamicContainer => {
      const element = dynamicContainer as HTMLElement;

      if (!element.style.minHeight) {
        element.style.minHeight = '20px';
      }

      element.style.contain = 'layout style';
    });
  }
}

