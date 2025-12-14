import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import { toast, type ToastKind, type ToastMessage } from '../utils/toast';

const DEFAULT_DURATION_MS: Record<ToastKind, number> = {
  success: 2500,
  info: 3000,
  warning: 4500,
  error: 6000,
};

function getKindStyles(kind: ToastKind) {
  switch (kind) {
    case 'success':
      return { icon: CheckCircle, bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800', text: 'text-green-800 dark:text-green-200' };
    case 'info':
      return { icon: Info, bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-800 dark:text-blue-200' };
    case 'warning':
      return { icon: AlertTriangle, bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-900 dark:text-amber-200' };
    case 'error':
      return { icon: XCircle, bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800', text: 'text-red-800 dark:text-red-200' };
  }
}

export function ToastViewport() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const timeoutsRef = useRef<Map<string, number>>(new Map());

  const dismiss = useCallback((id: string) => {
    const handle = timeoutsRef.current.get(id);
    if (handle) {
      window.clearTimeout(handle);
      timeoutsRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const timeouts = timeoutsRef.current;

    const unsubscribe = toast.subscribe((message) => {
      setToasts((prev) => [message, ...prev].slice(0, 5));

      const duration = message.durationMs ?? DEFAULT_DURATION_MS[message.kind];
      if (duration > 0) {
        const handle = window.setTimeout(() => dismiss(message.id), duration);
        timeouts.set(message.id, handle);
      }
    });

    return () => {
      unsubscribe();
      for (const handle of timeouts.values()) {
        window.clearTimeout(handle);
      }
      timeouts.clear();
    };
  }, [dismiss]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] space-y-3 w-[min(380px,calc(100vw-2rem))]">
      {toasts.map((t) => {
        const styles = getKindStyles(t.kind);
        const Icon = styles.icon;

        return (
          <div
            key={t.id}
            className={`${styles.bg} ${styles.border} ${styles.text} border rounded-2xl shadow-lg backdrop-blur-sm p-4 flex items-start gap-3`}
            role={t.kind === 'error' ? 'alert' : 'status'}
          >
            <div className="mt-0.5">
              <Icon className="w-5 h-5" />
            </div>

            <div className="flex-1 min-w-0">
              {t.title && <div className="font-medium mb-0.5">{t.title}</div>}
              <div className="text-sm leading-snug break-words whitespace-pre-line">{t.message}</div>
            </div>

            <button
              onClick={() => dismiss(t.id)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default ToastViewport;
