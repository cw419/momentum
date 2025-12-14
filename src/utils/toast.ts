export type ToastKind = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  kind: ToastKind;
  title?: string;
  message: string;
  createdAt: number;
  durationMs?: number;
}

type Listener = (toast: ToastMessage) => void;

function generateToastId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `toast_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

class ToastStore {
  private listeners = new Set<Listener>();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private publish(toast: Omit<ToastMessage, 'id' | 'createdAt'> & { id?: string; createdAt?: number }) {
    const message: ToastMessage = {
      id: toast.id ?? generateToastId(),
      createdAt: toast.createdAt ?? Date.now(),
      ...toast,
    };

    for (const listener of this.listeners) {
      listener(message);
    }
  }

  success(message: string, options?: { title?: string; durationMs?: number }) {
    this.publish({ kind: 'success', message, ...options });
  }

  error(message: string, options?: { title?: string; durationMs?: number }) {
    this.publish({ kind: 'error', message, ...options });
  }

  info(message: string, options?: { title?: string; durationMs?: number }) {
    this.publish({ kind: 'info', message, ...options });
  }

  warning(message: string, options?: { title?: string; durationMs?: number }) {
    this.publish({ kind: 'warning', message, ...options });
  }
}

export const toast = new ToastStore();

