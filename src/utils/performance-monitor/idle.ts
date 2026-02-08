export function runWhenIdle(
  callback: () => void,
  timeout: number = 1000,
): void {
  if (typeof window === 'undefined') return;

  const requestIdleCallbackFn = window.requestIdleCallback;
  if (typeof requestIdleCallbackFn === 'function') {
    requestIdleCallbackFn(() => callback(), { timeout });
    return;
  }

  setTimeout(callback, 0);
}
