/**
 * 布局稳定性类型定义和工具函数
 */

export interface LayoutIssue {
  type: 'horizontal-overflow' | 'layout-shift' | 'unstable-width';
  element: HTMLElement;
  severity: 'low' | 'medium' | 'high';
  description: string;
  suggestedFix?: string;
}

export interface StabilityReport {
  cumulativeLayoutShift: number;
  totalIssues: number;
  issuesByType: Record<string, number>;
  issuesBySeverity: Record<string, number>;
  recommendations: string[];
}

export interface ElementDescription {
  tagName: string;
  id?: string;
  className?: string;
}

export function describeElement(element: HTMLElement): ElementDescription {
  const className = typeof element.className === 'string'
    ? element.className
    : String(element.className);
  return {
    tagName: element.tagName,
    id: element.id || undefined,
    className: className || undefined,
  };
}

export function isLayoutShiftEntry(entry: PerformanceEntry): entry is LayoutShift {
  if (entry.entryType !== 'layout-shift') return false;
  const candidate = entry as Partial<LayoutShift>;
  return typeof candidate.value === 'number' && typeof candidate.hadRecentInput === 'boolean';
}
