/**
 * 异步操作管理器
 * 优化耗时操作，提供乐观更新和错误恢复
 */

import { batchOptimisticUpdate, optimisticUpdate } from './optimistic';
import { processQueue } from './queue';
import { executeWithRetry } from './retry';
import type { AsyncOperation, OperationState, OptimisticUpdate } from './types';
import { executeOnce } from './dedupe';
import { debounceOperation } from './debounce';
import { normalizeUnknownError } from '../errors/normalizeError';

export class AsyncOperationManager {
  private operations = new Map<string, OperationState>();
  private operationQueue: AsyncOperation<unknown>[] = [];
  private pendingOperations = new Map<string, Promise<unknown>>();
  private isProcessing = false;
  private maxConcurrent = 3;
  private defaultTimeout = 5000;
  private defaultRetryCount = 2;
  private debounceTimers = new Map<string, NodeJS.Timeout>();

  async executeOperation<T>(operation: AsyncOperation<T>): Promise<T> {
    const operationState: OperationState<T> = {
      id: operation.id,
      status: 'pending',
      attempts: 0,
      startTime: Date.now(),
    };

    this.operations.set(operation.id, operationState);

    try {
      const result = await executeWithRetry({
        operation,
        operations: this.operations,
        defaultRetryCount: this.defaultRetryCount,
        defaultTimeout: this.defaultTimeout,
      });

      operationState.status = 'success';
      operationState.result = result;

      operation.onSuccess?.(result);
      return result;
    } catch (error) {
      const normalizedError = normalizeUnknownError(error);
      operationState.status = 'error';
      operationState.error = normalizedError;

      operation.onError?.(normalizedError);
      throw error;
    } finally {
      setTimeout(() => {
        this.operations.delete(operation.id);
      }, 30000);
    }
  }

  async executeBatch<T>(operations: AsyncOperation<T>[]): Promise<T[]> {
    const promises = operations.map((op) => this.executeOperation(op));
    return Promise.all(promises);
  }

  queueOperation<T>(operation: AsyncOperation<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const wrappedOperation: AsyncOperation<T> = {
        ...operation,
        onSuccess: (result) => {
          operation.onSuccess?.(result);
          resolve(result);
        },
        onError: (error) => {
          operation.onError?.(error);
          reject(error);
        },
      };

      this.operationQueue.push(wrappedOperation as AsyncOperation<unknown>);
      this.processQueue().catch(() => undefined);
    });
  }

  cancelOperation(id: string): boolean {
    const operationState = this.operations.get(id);
    if (operationState && operationState.status === 'pending') {
      operationState.status = 'cancelled';
      this.operations.delete(id);
      return true;
    }
    return false;
  }

  getOperationStatus(id: string): OperationState | undefined {
    return this.operations.get(id);
  }

  getPendingOperations(): OperationState[] {
    return Array.from(this.operations.values()).filter(
      (op) => op.status === 'pending',
    );
  }

  clearAll(): void {
    this.operations.clear();
    this.operationQueue = [];
  }

  private async processQueue(): Promise<void> {
    return processQueue({
      operationQueue: this.operationQueue,
      maxConcurrent: this.maxConcurrent,
      getIsProcessing: () => this.isProcessing,
      setIsProcessing: (value) => {
        this.isProcessing = value;
      },
      executeOperation: (operation) => this.executeOperation(operation),
    });
  }

  async optimisticUpdate<T>(update: OptimisticUpdate<T>): Promise<T> {
    return optimisticUpdate<T>({
      update,
      pendingOperations: this.pendingOperations,
      executeOperation: (operation) => this.executeOperation(operation),
    });
  }

  async executeOnce<T>(key: string, operation: () => Promise<T>): Promise<T> {
    return executeOnce(this.pendingOperations, key, operation);
  }

  debounceOperation<T>(
    key: string,
    operation: () => Promise<T>,
    delay: number = 300,
  ): Promise<T> {
    return debounceOperation({
      debounceTimers: this.debounceTimers,
      pendingOperations: this.pendingOperations,
      key,
      operation,
      delay,
    });
  }

  async batchOptimisticUpdate<T>(updates: OptimisticUpdate<T>[]): Promise<T[]> {
    return batchOptimisticUpdate({
      updates,
      executeOperation: (operation) => this.executeOperation(operation),
    });
  }

  getOperationStats(): {
    totalOperations: number;
    pendingOperations: number;
    successfulOperations: number;
    failedOperations: number;
    averageExecutionTime: number;
  } {
    const operations = Array.from(this.operations.values());
    const successful = operations.filter((op) => op.status === 'success');
    const failed = operations.filter((op) => op.status === 'error');

    const totalExecutionTime = successful.reduce((sum, op) => {
      return sum + (Date.now() - op.startTime);
    }, 0);

    return {
      totalOperations: operations.length,
      pendingOperations: this.pendingOperations.size,
      successfulOperations: successful.length,
      failedOperations: failed.length,
      averageExecutionTime:
        successful.length > 0 ? totalExecutionTime / successful.length : 0,
    };
  }

  cleanupExpiredOperations(maxAge: number = 300000): void {
    const now = Date.now();
    for (const [id, operation] of this.operations.entries()) {
      if (now - operation.startTime > maxAge) {
        this.operations.delete(id);
      }
    }
  }
}

export const asyncOperationManager = new AsyncOperationManager();
