export type ResizeChangeHandler = (element: HTMLElement) => void;

export class ResizeChangeObserver {
  private observer: ResizeObserver | null = null;
  private readonly onResize: ResizeChangeHandler;

  constructor(onResize: ResizeChangeHandler) {
    this.onResize = onResize;
  }

  observe(target: HTMLElement): void {
    if (typeof window === 'undefined') return;
    if (!('ResizeObserver' in window)) return;

    this.observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        this.onResize(entry.target as HTMLElement);
      }
    });

    this.observer.observe(target);
  }

  stop(): void {
    this.observer?.disconnect();
    this.observer = null;
  }
}

