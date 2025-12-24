import { useCallback, useEffect, useState } from 'react';
import type { CheckinResult, CheckinStats } from '../../domain/checkin';
import { useStorage } from '../../storage/StorageContext';
import { logger } from '../../utils/logger';
import { useI18n } from '../../i18n';
import { getSafeErrorDetail } from '../../utils/errorMessage';

export function useCheckinDomain() {
  const { language, tr } = useI18n();
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
      setError(tr('签到功能需要登录后使用', 'Daily check-in requires login'));
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      setIsLoading(true);
      const result = await storage.getUserCheckinStats();
      if (!result.ok) {
        const safeDetail = getSafeErrorDetail(result.error.message, language);
        setError(safeDetail ?? tr('加载签到数据失败，请重试（详情见控制台）', 'Failed to load check-in data. Check the console for details, then try again.'));
        setStats(null);
        return;
      }
      setStats(result.value);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      logger.error('CHECKIN', '加载签到统计失败', undefined, errorObj);
      const safeDetail = err instanceof Error ? getSafeErrorDetail(err.message, language) : null;
      setError(safeDetail ?? tr('加载签到数据失败，请重试（详情见控制台）', 'Failed to load check-in data. Check the console for details, then try again.'));
    } finally {
      setIsLoading(false);
    }
  }, [isSupabase, language, storage, tr]);

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
        const safeDetail = getSafeErrorDetail(op.error.message, language);
        setError(safeDetail ?? tr('签到失败，请重试（详情见控制台）', 'Check-in failed. Check the console for details, then try again.'));
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

        setSuccessMessage(
          tr(
            `签到成功！获得${result.points_earned} 积分，连续签到${result.consecutive_days} 天`,
            `Checked in! Earned ${result.points_earned} points. Streak: ${result.consecutive_days} days.`
          )
        );
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        const safeDetail = result.message ? getSafeErrorDetail(result.message, language) : null;
        setError(safeDetail ?? tr('签到失败', 'Check-in failed'));
      }
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      logger.error('CHECKIN', '签到失败', undefined, errorObj);
      const safeDetail = err instanceof Error ? getSafeErrorDetail(err.message, language) : null;
      setError(safeDetail ?? tr('签到失败，请重试（详情见控制台）', 'Check-in failed. Check the console for details, then try again.'));
    } finally {
      setIsCheckingIn(false);
    }
  }, [isCheckingIn, language, stats, storage, tr]);

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
