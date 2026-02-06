export interface LayoutIssue {
  type: 'horizontal-overflow' | 'layout-shift' | 'unstable-width';
  element: HTMLElement;
  severity: 'low' | 'medium' | 'high';
  description: string;
  suggestedFix?: string;
}

