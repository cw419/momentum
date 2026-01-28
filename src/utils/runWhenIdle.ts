export function runWhenIdle(callback: () => void, timeoutMs: number = 2000): void {
  const requestIdleCallbackFn = window.requestIdleCallback;
  if (typeof requestIdleCallbackFn === 'function') {
    requestIdleCallbackFn(callback, { timeout: timeoutMs });
    return;
  }

  setTimeout(callback, 0);
}

