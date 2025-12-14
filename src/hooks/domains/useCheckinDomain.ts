import { useCallback, useEffect, useState } from 'react';
import type { CheckinResult, CheckinStats } from '../../domain/checkin';
import { useStorage } from '../../storage/StorageContext';

export function useCheckinDomain() {
  const storage = useStorage();
  const isSupabase = storage.kind === 'supabase';

  const [stats, setStats] = useState<CheckinStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);

  const loadStats = useCallback(async () => {
    if (!isSupabase) {
      setError('签到功能需要登录后使用');
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      setIsLoading(true);
      const result = await storage.getUserCheckinStats();
      if (!result.ok) {
        setError(result.error.message);
        setStats(null);
        return;
      }
      setStats(result.value);
    } catch (err) {
      console.error('加载签到统计失败:', err);
      setError(err instanceof Error ? err.message : '加载签到数据失败');
    } finally {
      setIsLoading(false);
    }
  }, [isSupabase, storage]);

  const handleCheckin = useCallback(async () => {
    if (!stats || stats.has_checked_in_today || isCheckingIn) {
      return;
    }

    try {
      setIsCheckingIn(true);
      setError(null);
      setSuccessMessage(null);

      const op = await storage.performDailyCheckin();
      if (!op.ok) {
        setError(op.error.message);
        return;
      }

      const result: CheckinResult = op.value;

      if (result.success) {
        setStats(prev =>
          prev
            ? {
                ...prev,
                total_points: result.total_points || prev.total_points + result.points_earned,
                total_checkins: prev.total_checkins + 1,
                current_streak: result.consecutive_days,
                has_checked_in_today: true,
                last_checkin_date: result.checkin_date,
              }
            : null
        );

        setSuccessMessage(`签到成功！获得${result.points_earned} 积分，连续签到${result.consecutive_days} 天`);
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(result.message || '签到失败');
      }
    } catch (err) {
      console.error('签到失败:', err);
      setError(err instanceof Error ? err.message : '签到失败，请重试');
    } finally {
      setIsCheckingIn(false);
    }
  }, [stats, isCheckingIn]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return {
    stats,
    isLoading,
    isCheckingIn,
    error,
    successMessage,
    isCollapsed,
    clearError,
    toggleCollapsed,
    loadStats,
    handleCheckin,
  };
}
