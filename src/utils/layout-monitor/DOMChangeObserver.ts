export type DOMChangeHandler = (element: HTMLElement) => void;

export class DOMChangeObserver {
  private observer: MutationObserver | null = null;
  private readonly onElementChange: DOMChangeHandler;

  constructor(onElementChange: DOMChangeHandler) {
    this.onElementChange = onElementChange;
  }

  observe(target: HTMLElement): void {
    if (typeof window === 'undefined') return;
    if (!('MutationObserver' in window)) return;

    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              this.onElementChange(node as HTMLElement);
            }
          });
        } else if (mutation.type === 'attributes' && mutation.target.nodeType === Node.ELEMENT_NODE) {
          this.onElementChange(mutation.target as HTMLElement);
        }
      }
    });

    this.observer.observe(target, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    });
  }

  stop(): void {
    this.observer?.disconnect();
    this.observer = null;
  }
}

