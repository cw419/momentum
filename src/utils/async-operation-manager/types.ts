export interface AsyncOperation<T = unknown> {
  id: string;
  operation: () => Promise<T>;
  timeout?: number;
  retryCount?: number;
  onSuccess?: (result: T) => void;
  onError?: (error: Error) => void;
  onRetry?: (attempt: number) => void;
}

export interface OptimisticUpdate<T = unknown> {
  id: string;
  operation: () => Promise<T>;
  optimisticValue: T;
  updateUI: (value: T) => void;
  rollback: () => void;
  timeout?: number;
  retryCount?: number;
}

export interface OperationState<T = unknown> {
  id: string;
  status: 'pending' | 'success' | 'error' | 'cancelled';
  result?: T;
  error?: Error;
  attempts: number;
  startTime: number;
}

