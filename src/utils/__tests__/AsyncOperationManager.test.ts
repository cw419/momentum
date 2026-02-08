import { AsyncOperationManager } from '../AsyncOperationManager';

describe('AsyncOperationManager', () => {
  let manager: AsyncOperationManager;

  beforeEach(() => {
    manager = new AsyncOperationManager();
    vi.clearAllMocks();
  });

  afterEach(() => {
    manager.clearAll();
    vi.useRealTimers();
  });

  describe('basic operations', () => {
    it('should execute operation successfully', async () => {
      const mockOperation = vi.fn().mockResolvedValue('success');
      const onSuccess = vi.fn();

      const result = await manager.executeOperation({
        id: 'test-op',
        operation: mockOperation,
        onSuccess,
      });

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalledWith('success');
    });

    it('should handle operation errors', async () => {
      const mockOperation = vi.fn().mockRejectedValue(new Error('Test error'));
      const onError = vi.fn();

      await expect(
        manager.executeOperation({
          id: 'test-op',
          operation: mockOperation,
          retryCount: 0,
          onError,
        }),
      ).rejects.toThrow('Test error');

      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should retry failed operations', async () => {
      vi.useFakeTimers();
      const mockOperation = vi
        .fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValue('success');

      const onRetry = vi.fn();

      const pending = manager.executeOperation({
        id: 'test-op',
        operation: mockOperation,
        retryCount: 2,
        onRetry,
      });
      await vi.runAllTimersAsync();
      const result = await pending;

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(3);
      expect(onRetry).toHaveBeenCalledTimes(2);
    });

    it('should timeout operations', async () => {
      vi.useFakeTimers();
      const mockOperation = vi.fn(
        () => new Promise((resolve) => setTimeout(resolve, 1000)),
      );

      const pending = manager.executeOperation({
        id: 'test-op',
        operation: mockOperation,
        timeout: 100,
      });
      const rejection = expect(pending).rejects.toThrow(/100ms/);
      await vi.runAllTimersAsync();
      await rejection;
    });
  });

  describe('optimistic updates', () => {
    it('should perform optimistic update successfully', async () => {
      const mockOperation = vi.fn().mockResolvedValue('real-result');
      const updateUI = vi.fn();
      const rollback = vi.fn();

      const result = await manager.optimisticUpdate({
        id: 'test-optimistic',
        operation: mockOperation,
        optimisticValue: 'optimistic-result',
        updateUI,
        rollback,
      });

      expect(updateUI).toHaveBeenCalledWith('optimistic-result');
      expect(updateUI).toHaveBeenCalledWith('real-result');
      expect(rollback).not.toHaveBeenCalled();
      expect(result).toBe('real-result');
    });

    it('should rollback on optimistic update failure', async () => {
      const mockOperation = vi
        .fn()
        .mockRejectedValue(new Error('Operation failed'));
      const updateUI = vi.fn();
      const rollback = vi.fn();

      await expect(
        manager.optimisticUpdate({
          id: 'test-optimistic',
          operation: mockOperation,
          retryCount: 0,
          optimisticValue: 'optimistic-result',
          updateUI,
          rollback,
        }),
      ).rejects.toThrow('Operation failed');

      expect(updateUI).toHaveBeenCalledWith('optimistic-result');
      expect(rollback).toHaveBeenCalled();
    });

    it('should handle batch optimistic updates', async () => {
      const mockOperation1 = vi.fn().mockResolvedValue('result1');
      const mockOperation2 = vi.fn().mockResolvedValue('result2');
      const updateUI1 = vi.fn();
      const updateUI2 = vi.fn();
      const rollback1 = vi.fn();
      const rollback2 = vi.fn();

      const results = await manager.batchOptimisticUpdate([
        {
          id: 'test1',
          operation: mockOperation1,
          optimisticValue: 'opt1',
          updateUI: updateUI1,
          rollback: rollback1,
        },
        {
          id: 'test2',
          operation: mockOperation2,
          optimisticValue: 'opt2',
          updateUI: updateUI2,
          rollback: rollback2,
        },
      ]);

      expect(results).toEqual(['result1', 'result2']);
      expect(updateUI1).toHaveBeenCalledWith('opt1');
      expect(updateUI1).toHaveBeenCalledWith('result1');
      expect(updateUI2).toHaveBeenCalledWith('opt2');
      expect(updateUI2).toHaveBeenCalledWith('result2');
    });
  });

  describe('duplicate prevention', () => {
    it('should prevent duplicate operations', async () => {
      const mockOperation = vi.fn().mockResolvedValue('result');

      const promise1 = manager.executeOnce('duplicate-key', mockOperation);
      const promise2 = manager.executeOnce('duplicate-key', mockOperation);

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1).toBe('result');
      expect(result2).toBe('result');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should allow different keys to execute separately', async () => {
      const mockOperation1 = vi.fn().mockResolvedValue('result1');
      const mockOperation2 = vi.fn().mockResolvedValue('result2');

      const [result1, result2] = await Promise.all([
        manager.executeOnce('key1', mockOperation1),
        manager.executeOnce('key2', mockOperation2),
      ]);

      expect(result1).toBe('result1');
      expect(result2).toBe('result2');
      expect(mockOperation1).toHaveBeenCalledTimes(1);
      expect(mockOperation2).toHaveBeenCalledTimes(1);
    });
  });

  describe('debounced operations', () => {
    it('should debounce rapid operations', async () => {
      vi.useFakeTimers();
      const mockOperation = vi.fn().mockResolvedValue('result');

      // Fire multiple rapid operations
      const _promise1 = manager.debounceOperation(
        'debounce-key',
        mockOperation,
        100,
      );
      const _promise2 = manager.debounceOperation(
        'debounce-key',
        mockOperation,
        100,
      );
      const promise3 = manager.debounceOperation(
        'debounce-key',
        mockOperation,
        100,
      );

      // Wait for debounce delay
      await vi.advanceTimersByTimeAsync(150);

      const result = await promise3;

      expect(result).toBe('result');
      expect(mockOperation).toHaveBeenCalledTimes(1);
      void _promise1;
      void _promise2;
    });
  });

  describe('queue operations', () => {
    it('should queue and process operations', async () => {
      const mockOperation1 = vi.fn().mockResolvedValue('result1');
      const mockOperation2 = vi.fn().mockResolvedValue('result2');

      const promise1 = manager.queueOperation({
        id: 'queue1',
        operation: mockOperation1,
      });

      const promise2 = manager.queueOperation({
        id: 'queue2',
        operation: mockOperation2,
      });

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1).toBe('result1');
      expect(result2).toBe('result2');
    });
  });

  describe('operation management', () => {
    it('should track operation status', async () => {
      vi.useFakeTimers();
      const mockOperation = vi.fn(
        () =>
          new Promise((resolve) => setTimeout(() => resolve('result'), 100)),
      );

      const promise = manager.executeOperation({
        id: 'tracked-op',
        operation: mockOperation,
      });

      const status = manager.getOperationStatus('tracked-op');
      expect(status?.status).toBe('pending');

      await vi.advanceTimersByTimeAsync(100);
      await promise;

      const finalStatus = manager.getOperationStatus('tracked-op');
      expect(finalStatus?.status).toBe('success');
    });

    it('should cancel pending operations', async () => {
      vi.useFakeTimers();
      const mockOperation = vi.fn(
        () =>
          new Promise((resolve) => setTimeout(() => resolve('result'), 1000)),
      );

      const pending = manager.executeOperation({
        id: 'cancel-op',
        operation: mockOperation,
      });

      const cancelled = manager.cancelOperation('cancel-op');
      expect(cancelled).toBe(true);

      const status = manager.getOperationStatus('cancel-op');
      expect(status).toBeUndefined();
      await vi.runAllTimersAsync();
      await expect(pending).resolves.toBe('result');
    });

    it('should get pending operations', async () => {
      vi.useFakeTimers();
      const mockOperation = vi.fn(
        () =>
          new Promise((resolve) => setTimeout(() => resolve('result'), 100)),
      );

      manager.executeOperation({
        id: 'pending1',
        operation: mockOperation,
      });

      manager.executeOperation({
        id: 'pending2',
        operation: mockOperation,
      });

      const pending = manager.getPendingOperations();
      expect(pending).toHaveLength(2);
      await vi.runAllTimersAsync();
    });
  });

  describe('statistics and cleanup', () => {
    it('should provide operation statistics', async () => {
      const mockOperation = vi.fn().mockResolvedValue('result');

      await manager.executeOperation({
        id: 'stats-op',
        operation: mockOperation,
      });

      const stats = manager.getOperationStats();
      expect(stats.totalOperations).toBe(1);
      expect(stats.successfulOperations).toBe(1);
      expect(stats.failedOperations).toBe(0);
    });

    it('should cleanup expired operations', async () => {
      const mockOperation = vi.fn().mockResolvedValue('result');

      await manager.executeOperation({
        id: 'expired-op',
        operation: mockOperation,
      });

      // Simulate time passing
      const originalNow = Date.now;
      Date.now = vi.fn(() => originalNow() + 400000); // 6.67 minutes later

      manager.cleanupExpiredOperations(300000); // 5 minutes max age

      const status = manager.getOperationStatus('expired-op');
      expect(status).toBeUndefined();

      // Restore Date.now
      Date.now = originalNow;
    });

    it('should clear all operations', async () => {
      const mockOperation = vi.fn().mockResolvedValue('result');

      await manager.executeOperation({
        id: 'clear-op',
        operation: mockOperation,
      });

      manager.clearAll();

      const stats = manager.getOperationStats();
      expect(stats.totalOperations).toBe(0);
    });
  });
});
