/**
 * useBettingModal hook
 * 封装 BettingModal 的状态和业务逻辑
 */

import { useState, useEffect, useCallback } from 'react';
import type { BetPlacementRequest, BetPlacementResult } from '../domain/betting';
import type { GamblingSettings } from '../domain/userSettings';
import { useStorage } from '../storage/useStorage';
import { useI18n } from '../i18n';
import { logger } from '../utils/logger';
import { getSafeErrorDetail, getSafeErrorDetailFromUnknown } from '../utils/errorMessage';

interface UseBettingModalOptions {
  isOpen: boolean;
  sessionId: string;
  onBetPlaced?: (betResult: BetPlacementResult) => void;
}

function validateDailyBetLimit(params: {
  numAmount: number;
  todayBetAmount: number;
  dailyBetLimit: number | undefined;
  language: string;
  setValidationError: (message: string) => void;
}) {
  const { numAmount, todayBetAmount, dailyBetLimit, language, setValidationError } = params;
  if (!dailyBetLimit) return true;

  const totalToday = todayBetAmount + numAmount;
  if (totalToday <= dailyBetLimit) return true;

  setValidationError(
    language === 'zh'
      ? `超出每日押注限制：${dailyBetLimit}（今日已用：${todayBetAmount}）`
      : `Exceeds daily limit: ${dailyBetLimit} (used today: ${todayBetAmount})`
  );
  return false;
}

export function useBettingModal({
  isOpen,
  sessionId,
  onBetPlaced
}: UseBettingModalOptions) {
  const storage = useStorage();
  const { language, tr } = useI18n();

  // 状态
  const [betAmount, setBetAmount] = useState<string>('');
  const [availablePoints, setAvailablePoints] = useState<number>(0);
  const [gamblingSettings, setGamblingSettings] = useState<GamblingSettings | null>(null);
  const [todayBetAmount, setTodayBetAmount] = useState<number>(0);

  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 加载初始数据
  const loadData = useCallback(async () => {
    if (!isOpen) return;
    if (storage.kind !== 'supabase') {
      setIsLoading(false);
      setError(tr('当前存储不支持押注功能', 'Betting is not supported for the current storage'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [pointsResult, settingsResult, todayBetsResult] = await Promise.all([
        storage.getUserAvailablePoints(),
        storage.getGamblingSettings(),
        storage.getTodayBetAmount(),
      ]);

      if (!pointsResult.ok) {
        const safeDetail = getSafeErrorDetail(pointsResult.error.message || '', language);
        setError(safeDetail ?? tr('加载数据失败，请重试（详情见控制台）', 'Failed to load data. Check the console for details, then try again.'));
        return;
      }
      if (!settingsResult.ok) {
        const safeDetail = getSafeErrorDetail(settingsResult.error.message || '', language);
        setError(safeDetail ?? tr('加载数据失败，请重试（详情见控制台）', 'Failed to load data. Check the console for details, then try again.'));
        return;
      }
      if (!todayBetsResult.ok) {
        const safeDetail = getSafeErrorDetail(todayBetsResult.error.message || '', language);
        setError(safeDetail ?? tr('加载数据失败，请重试（详情见控制台）', 'Failed to load data. Check the console for details, then try again.'));
        return;
      }

      setAvailablePoints(pointsResult.value);
      setGamblingSettings(settingsResult.value);
      setTodayBetAmount(todayBetsResult.value);

    } catch (err) {
      logger.error('BETTING', 'Failed to load betting data', undefined, err as Error);
      const safeDetail = getSafeErrorDetailFromUnknown(err, language);
      setError(safeDetail ?? tr('加载数据失败，请重试（详情见控制台）', 'Failed to load data. Check the console for details, then try again.'));
    } finally {
      setIsLoading(false);
    }
  }, [isOpen, language, storage, tr]);

  // 验证押注金额
  const validateBetAmount = useCallback(async (amount: string): Promise<boolean> => {
    setValidationError(null);

    if (!amount || amount.trim() === '') {
      setValidationError(tr('请输入押注金额', 'Enter a bet amount'));
      return false;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setValidationError(tr('押注金额必须大于 0', 'Bet amount must be greater than 0'));
      return false;
    }

    if (!Number.isInteger(numAmount)) {
      setValidationError(tr('押注金额必须是整数', 'Bet amount must be an integer'));
      return false;
    }

    if (numAmount > availablePoints) {
      setValidationError(
        language === 'zh'
          ? `可用积分不足，当前可用：${availablePoints}`
          : `Not enough points. Available: ${availablePoints}`
      );
      return false;
    }

    if (gamblingSettings?.max_single_bet && numAmount > gamblingSettings.max_single_bet) {
      setValidationError(
        language === 'zh'
          ? `超出单次押注限制：${gamblingSettings.max_single_bet}`
          : `Exceeds max single bet: ${gamblingSettings.max_single_bet}`
      );
      return false;
    }

    return validateDailyBetLimit({
      numAmount,
      todayBetAmount,
      dailyBetLimit: gamblingSettings?.daily_bet_limit ?? undefined,
      language,
      setValidationError,
    });
  }, [availablePoints, gamblingSettings, todayBetAmount, language, tr]);

  // 处理押注金额变化
  const handleBetAmountChange = useCallback((value: string) => {
    setBetAmount(value);
    setValidationError(null);
  }, []);

  // 快速选择押注金额
  const setQuickBetAmount = useCallback((amount: number) => {
    setBetAmount(amount.toString());
    setValidationError(null);
  }, []);

  // 提交押注
  const handlePlaceBet = useCallback(async () => {
    if (!await validateBetAmount(betAmount)) {
      return;
    }

    if (storage.kind !== 'supabase') {
      setError(tr('当前存储不支持押注功能', 'Betting is not supported for the current storage'));
      return;
    }

    const numAmount = parseFloat(betAmount);
    setIsPlacingBet(true);
    setError(null);

    try {
      const betRequest: BetPlacementRequest = {
        session_id: sessionId,
        bet_amount: numAmount
      };

      const result = await storage.placeBet(betRequest);

      if (!result.ok) {
        const safeDetail = getSafeErrorDetail(result.error.message || '', language);
        setError(safeDetail ?? tr('押注失败，请重试（详情见控制台）', 'Bet failed. Check the console for details, then try again.'));
        return;
      }

      if (result.value.success) {
        setSuccessMessage(
          language === 'zh'
            ? `押注成功！押注 ${numAmount} 积分，潜在收益 ${result.value.potential_payout} 积分`
            : `Bet placed! Bet ${numAmount} points, potential payout ${result.value.potential_payout} points`
        );

        setAvailablePoints(result.value.points_after ?? availablePoints - numAmount);
        setTodayBetAmount(prev => prev + numAmount);

        if (onBetPlaced) {
          onBetPlaced(result.value);
        }

      } else {
        const safeDetail = getSafeErrorDetail(result.value.message || '', language);
        setError(safeDetail ?? tr('押注失败', 'Bet failed'));
      }
    } catch (err) {
      logger.error('BETTING', 'Failed to place bet', { sessionId }, err as Error);
      const safeDetail = getSafeErrorDetailFromUnknown(err, language);
      setError(safeDetail ?? tr('押注失败，请重试（详情见控制台）', 'Bet failed. Check the console for details, then try again.'));
    } finally {
      setIsPlacingBet(false);
    }
  }, [betAmount, sessionId, availablePoints, onBetPlaced, validateBetAmount, storage, language, tr]);

  // 组件挂载时加载数据
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 重置状态当模态框关闭时
  useEffect(() => {
    if (!isOpen) {
      setBetAmount('');
      setError(null);
      setValidationError(null);
      setSuccessMessage(null);
    }
  }, [isOpen]);

  // 快速押注选项
  const quickBetOptions = [10, 25, 50, 100].filter(amount => amount <= availablePoints);

  return {
    // 状态
    betAmount,
    availablePoints,
    todayBetAmount,
    isPlacingBet,
    isLoading,
    error,
    validationError,
    successMessage,
    quickBetOptions,

    // 国际化
    language,
    tr,

    // 事件处理器
    handleBetAmountChange,
    setQuickBetAmount,
    handlePlaceBet,
    loadData
  };
}
