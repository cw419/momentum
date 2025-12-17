/**
 * 布局稳定性监控器
 * 监控和修复布局偏移问题
 */

import { isDev } from './env';
import { logger } from './logger';

function describeElement(element: HTMLElement): { tagName: string; id?: string; className?: string } {
  const className = typeof element.className === 'string' ? element.className : String(element.className);
  return {
    tagName: element.tagName,
    id: element.id || undefined,
    className: className || undefined,
  };
}

interface LayoutShiftEntry {
  value: number;
  sources: any[];
  hadRecentInput: boolean;
  timestamp: number;
}

interface LayoutIssue {
  type: 'horizontal-overflow' | 'layout-shift' | 'unstable-width';
  element: HTMLElement;
  severity: 'low' | 'medium' | 'high';
  description: string;
  suggestedFix?: string;
}

export class LayoutStabilityMonitor {
  private observer: PerformanceObserver | null = null;
  private mutationObserver: MutationObserver | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private cumulativeLayoutShift = 0;
  private layoutIssues: LayoutIssue[] = [];
  private isMonitoring = false;
  private autoFix = true;
  private stabilizationCallbacks: Set<() => void> = new Set();
  private isStabilizing = false;

  constructor(autoFix = true) {
    this.autoFix = autoFix;
  }

  private initializeMonitoring() {
    if (typeof window === 'undefined') return;

    // 监控布局偏移
    if ('PerformanceObserver' in window) {
      try {
        this.observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.handleLayoutShift(entry as any);
          }
        });
        this.observer.observe({ entryTypes: ['layout-shift'] });
      } catch (e) {
        if (isDev) {
          const err = e instanceof Error ? e : new Error(String(e));
          logger.warn('LAYOUT', '布局偏移监控初始化失败', undefined, err);
        }
      }
    }

    // 监控DOM变化
    this.mutationObserver = new MutationObserver((mutations) => {
      this.handleMutations(mutations);
    });

    // 监控元素大小变化
    if ('ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver((entries) => {
        this.handleResize(entries);
      });
    }
  }

  startMonitoring(container?: HTMLElement) {
    if (this.isMonitoring) return;

    this.initializeMonitoring();

    this.isMonitoring = true;
    const target = container || document.body;

    // 开始监控DOM变化
    this.mutationObserver?.observe(target, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    });

    // 开始监控大小变化
    this.resizeObserver?.observe(target);

    // 初始检查
    this.performInitialCheck(target);

    if (isDev) {
      logger.debug('LAYOUT', '🔍 布局稳定性监控已启动', { target: describeElement(target) });
    }
  }

  stopMonitoring() {
    this.isMonitoring = false;
    this.observer?.disconnect();
    this.mutationObserver?.disconnect();
    this.resizeObserver?.disconnect();

    if (isDev) {
      logger.debug('LAYOUT', '⏹️ 布局稳定性监控已停止');
      this.reportIssues();
    }
  }

  private handleLayoutShift(entry: LayoutShiftEntry) {
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

  private handleMutations(mutations: MutationRecord[]) {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        // 检查新添加的元素
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            this.checkElement(node as HTMLElement);
          }
        });
      } else if (mutation.type === 'attributes') {
        // 检查样式变化
        if (mutation.target.nodeType === Node.ELEMENT_NODE) {
          this.checkElement(mutation.target as HTMLElement);
        }
      }
    }
  }

  private handleResize(entries: ResizeObserverEntry[]) {
    for (const entry of entries) {
      this.checkElementStability(entry.target as HTMLElement);
    }
  }

  private performInitialCheck(container: HTMLElement) {
    // 检查横向溢出
    this.checkHorizontalOverflow(container);
    
    // 检查所有子元素
    const elements = container.querySelectorAll('*');
    elements.forEach(element => {
      this.checkElement(element as HTMLElement);
    });
  }

  private checkElement(element: HTMLElement) {
    // 检查横向溢出
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

    // 检查宽度稳定性
    this.checkElementStability(element);
  }

  private checkElementStability(element: HTMLElement) {
    const computedStyle = window.getComputedStyle(element);
    
    // 检查是否有不稳定的宽度设置
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

  private checkHorizontalOverflow(container: HTMLElement) {
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

  private attemptAutoFix(issue: LayoutIssue) {
    switch (issue.type) {
      case 'horizontal-overflow':
        this.fixHorizontalOverflow(issue.element);
        break;
      case 'unstable-width':
        this.fixUnstableWidth(issue.element);
        break;
    }
  }

  private fixHorizontalOverflow(element: HTMLElement) {
    // 应用横向溢出修复
    element.style.overflowX = 'hidden';
    element.style.maxWidth = '100%';
    element.style.boxSizing = 'border-box';

    if (isDev) {
      logger.debug('LAYOUT', '🔧 自动修复横向溢出', { element: describeElement(element) });
    }
  }

  private fixUnstableWidth(element: HTMLElement) {
    // 应用宽度稳定性修复
    const computedStyle = window.getComputedStyle(element);
    if (computedStyle.width === 'auto') {
      element.style.minWidth = '0';
      element.style.maxWidth = '100%';
    }

    if (isDev) {
      logger.debug('LAYOUT', '🔧 自动修复宽度不稳定', { element: describeElement(element) });
    }
  }

  // 获取布局稳定性报告
  getStabilityReport() {
    return {
      cumulativeLayoutShift: this.cumulativeLayoutShift,
      totalIssues: this.layoutIssues.length,
      issuesByType: this.groupIssuesByType(),
      issuesBySeverity: this.groupIssuesBySeverity(),
      recommendations: this.getRecommendations()
    };
  }

  private groupIssuesByType() {
    return this.layoutIssues.reduce((acc, issue) => {
      acc[issue.type] = (acc[issue.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private groupIssuesBySeverity() {
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

  private reportIssues() {
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

  // 手动触发检查
  checkNow(container?: HTMLElement) {
    const target = container || document.body;
    this.performInitialCheck(target);
  }

  // 清除问题记录
  clearIssues() {
    this.layoutIssues = [];
    this.cumulativeLayoutShift = 0;
  }

  // 预防性布局稳定化
  stabilizeLayout(container: HTMLElement): void {
    if (this.isStabilizing) return;
    
    this.isStabilizing = true;
    
    // 使用 requestAnimationFrame 确保在下一帧处理
    requestAnimationFrame(() => {
      this.precomputeLayout(container);
      this.fixCommonIssues(container);
      
      // 通知稳定化完成
      this.stabilizationCallbacks.forEach(callback => {
        try {
          callback();
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          logger.error('LAYOUT', 'Stabilization callback error', undefined, err);
        }
      });
      
      this.isStabilizing = false;
    });
  }

  // 预计算布局
  private precomputeLayout(container: HTMLElement): void {
    // 为规则项设置固定高度
    const ruleItems = container.querySelectorAll('.rule-item, [data-rule-item]');
    ruleItems.forEach(item => {
      const element = item as HTMLElement;
      if (!element.style.minHeight) {
        element.style.minHeight = '60px';
        element.style.boxSizing = 'border-box';
      }
    });

    // 为列表容器设置稳定的尺寸
    const listContainers = container.querySelectorAll('.rule-list, [data-rule-list]');
    listContainers.forEach(list => {
      const element = list as HTMLElement;
      if (!element.style.height && !element.style.maxHeight) {
        element.style.maxHeight = '400px';
        element.style.overflowY = 'auto';
      }
    });

    // 为弹出层设置固定定位
    const tooltips = container.querySelectorAll('.tooltip, [data-tooltip]');
    tooltips.forEach(tooltip => {
      const element = tooltip as HTMLElement;
      if (window.getComputedStyle(element).position !== 'fixed') {
        element.style.position = 'absolute';
        element.style.zIndex = '9999';
      }
    });
  }

  // 修复常见问题
  private fixCommonIssues(container: HTMLElement): void {
    // 修复滚动容器
    this.fixScrollContainers(container);
    
    // 修复弹出层
    this.fixPopoverLayers(container);
    
    // 修复动态内容
    this.fixDynamicContent(container);
  }

  private fixScrollContainers(container: HTMLElement): void {
    const scrollContainers = container.querySelectorAll('[data-scroll-container]');
    scrollContainers.forEach(scrollContainer => {
      const element = scrollContainer as HTMLElement;
      
      // 确保滚动容器有明确的高度
      if (!element.style.height && !element.style.maxHeight) {
        element.style.maxHeight = '400px';
      }
      
      // 优化滚动性能
      element.style.overflowY = 'auto';
      element.style.overscrollBehavior = 'contain';
      element.style.scrollBehavior = 'smooth';
      
      // 防止滚动时的布局抖动
      element.style.willChange = 'scroll-position';
    });
  }

  private fixPopoverLayers(container: HTMLElement): void {
    const popovers = container.querySelectorAll('[data-popover], .popover, .tooltip');
    popovers.forEach(popover => {
      const element = popover as HTMLElement;
      
      // 使用 transform 而不是改变布局
      element.style.transform = element.style.transform || 'translateZ(0)';
      element.style.backfaceVisibility = 'hidden';
      
      // 确保弹出层不影响文档流
      if (window.getComputedStyle(element).position === 'static') {
        element.style.position = 'absolute';
      }
    });
  }

  private fixDynamicContent(container: HTMLElement): void {
    // 为动态加载的内容预留空间
    const dynamicContainers = container.querySelectorAll('[data-dynamic-content]');
    dynamicContainers.forEach(dynamicContainer => {
      const element = dynamicContainer as HTMLElement;
      
      // 设置最小高度避免内容加载时的跳动
      if (!element.style.minHeight) {
        element.style.minHeight = '20px';
      }
      
      // 使用 contain 属性优化渲染
      element.style.contain = 'layout style';
    });
  }

  // 注册稳定化回调
  onStabilized(callback: () => void): () => void {
    this.stabilizationCallbacks.add(callback);
    return () => this.stabilizationCallbacks.delete(callback);
  }

  // 检查是否正在稳定化
  isStabilizingLayout(): boolean {
    return this.isStabilizing;
  }
}

// 单例实例
export const layoutStabilityMonitor = new LayoutStabilityMonitor();

// React Hook
export const useLayoutStability = (containerRef?: React.RefObject<HTMLElement>) => {
  const startMonitoring = () => {
    const container = containerRef?.current || undefined;
    layoutStabilityMonitor.startMonitoring(container);
  };

  const stopMonitoring = () => {
    layoutStabilityMonitor.stopMonitoring();
  };

  const checkNow = () => {
    const container = containerRef?.current || undefined;
    layoutStabilityMonitor.checkNow(container);
  };

  const getReport = () => {
    return layoutStabilityMonitor.getStabilityReport();
  };

  return {
    startMonitoring,
    stopMonitoring,
    checkNow,
    getReport,
    clearIssues: () => layoutStabilityMonitor.clearIssues()
  };
};
