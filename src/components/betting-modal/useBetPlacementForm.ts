import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  BetPlacementRequest,
  BetPlacementResult,
} from '../../domain/betting';
import type { GamblingSettings } from '../../domain/userSettings';
import type { Language } from '../../i18n';
import type { MomentumStorage } from '../../storage/MomentumStorage';
import {
  getSafeErrorDetail,
  getSafeErrorDetailFromUnknown,
} from '../../utils/errorMessage';
import { normalizeUnknownError } from '../../utils/errors/normalizeError';
import { logger } from '../../utils/logger';
import { getBetPlacementValidationError } from './betPlacementRules';

export function useBetPlacementForm(params: {
  isOpen: boolean;
  sessionId: string;
  onBetPlaced?: (result: BetPlacementResult) => void;
  storage: Pick<MomentumStorage, 'placeBet'>;
  canUseBetting: boolean;
  language: Language;
  tr: (zh: string, en: string) => string;
  availablePoints: number;
  setAvailablePoints: React.Dispatch<React.SetStateAction<number>>;
  todayBetAmount: number;
  setTodayBetAmount: React.Dispatch<React.SetStateAction<number>>;
  gamblingSettings: GamblingSettings | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
}) {
  const {
    availablePoints,
    canUseBetting,
    gamblingSettings,
    isOpen,
    language,
    onBetPlaced,
    sessionId,
    setAvailablePoints,
    setError,
    setTodayBetAmount,
    storage,
    todayBetAmount,
    tr,
  } = params;
  const [betAmount, setBetAmount] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPlacingBet, setIsPlacingBet] = useState(false);

  const handleBetAmountChange = useCallback((value: string) => {
    setBetAmount(value);
    setValidationError(null);
  }, []);
  const setQuickBetAmount = useCallback((amount: number) => {
    setBetAmount(String(amount));
    setValidationError(null);
  }, []);

  const handlePlaceBet = useCallback(async () => {
    const validationMessage = getBetPlacementValidationError({
      amount: betAmount,
      availablePoints,
      todayBetAmount,
      settings: gamblingSettings,
      tr,
    });
    setValidationError(validationMessage);
    if (validationMessage) return;
    if (!canUseBetting) {
      setError(
        tr(
          '当前存储不支持押注功能',
          'Betting is not supported for the current storage',
        ),
      );
      return;
    }

    const numAmount = Number(betAmount);
    setIsPlacingBet(true);
    setError(null);
    try {
      const request: BetPlacementRequest = {
        session_id: sessionId,
        bet_amount: numAmount,
      };
      const result = await storage.placeBet(request);
      if (!result.ok || !result.value.success) {
        const message = result.ok ? result.value.message : result.error.message;
        setError(
          getSafeErrorDetail(message || '', language) ??
            tr('押注失败', 'Bet failed'),
        );
        return;
      }
      setSuccessMessage(
        language === 'zh'
          ? `押注成功！押注 ${numAmount} 积分，潜在收益 ${result.value.potential_payout} 积分`
          : `Bet placed! Bet ${numAmount} points, potential payout ${result.value.potential_payout} points`,
      );
      setAvailablePoints(
        result.value.points_after ?? availablePoints - numAmount,
      );
      setTodayBetAmount((previous) => previous + numAmount);
      onBetPlaced?.(result.value);
    } catch (error) {
      logger.error(
        'BETTING',
        'Failed to place bet',
        { sessionId },
        normalizeUnknownError(error),
      );
      setError(
        getSafeErrorDetailFromUnknown(error, language) ??
          tr(
            '押注失败，请重试（详情见控制台）',
            'Bet failed. Check the console for details, then try again.',
          ),
      );
    } finally {
      setIsPlacingBet(false);
    }
  }, [
    availablePoints,
    betAmount,
    canUseBetting,
    gamblingSettings,
    language,
    onBetPlaced,
    sessionId,
    setAvailablePoints,
    setError,
    setTodayBetAmount,
    storage,
    todayBetAmount,
    tr,
  ]);

  useEffect(() => {
    if (!isOpen) {
      setBetAmount('');
      setError(null);
      setValidationError(null);
      setSuccessMessage(null);
    }
  }, [isOpen, setError]);

  const quickBetOptions = useMemo(
    () => [10, 25, 50, 100].filter((amount) => amount <= availablePoints),
    [availablePoints],
  );

  return {
    betAmount,
    isPlacingBet,
    validationError,
    successMessage,
    quickBetOptions,
    handleBetAmountChange,
    setQuickBetAmount,
    handlePlaceBet,
  };
}
