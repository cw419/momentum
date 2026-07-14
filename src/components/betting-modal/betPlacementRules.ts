import type { GamblingSettings } from '../../domain/userSettings';

interface BetPlacementValidationParams {
  amount: string;
  availablePoints: number;
  todayBetAmount: number;
  settings: GamblingSettings | null;
  tr: (zh: string, en: string) => string;
}

export function getBetPlacementValidationError({
  amount,
  availablePoints,
  todayBetAmount,
  settings,
  tr,
}: BetPlacementValidationParams): string | null {
  if (!amount.trim()) return tr('请输入押注金额', 'Enter a bet amount');

  const value = Number(amount);
  if (!Number.isFinite(value)) {
    return tr('请输入有效的押注金额', 'Enter a valid bet amount');
  }
  if (!Number.isInteger(value)) {
    return tr('押注金额必须是整数', 'Bet amount must be an integer');
  }
  if (value <= 0) {
    return tr('押注金额必须大于 0', 'Bet amount must be greater than 0');
  }
  if (value > availablePoints) {
    return tr(
      `可用积分不足，当前可用：${availablePoints}`,
      `Not enough points. Available: ${availablePoints}`,
    );
  }
  if (settings?.max_single_bet && value > settings.max_single_bet) {
    return tr(
      `超出单次押注限制：${settings.max_single_bet}`,
      `Exceeds max single bet: ${settings.max_single_bet}`,
    );
  }
  if (
    settings?.daily_bet_limit &&
    todayBetAmount + value > settings.daily_bet_limit
  ) {
    return tr(
      `超出每日押注限制：${settings.daily_bet_limit}（今日已用：${todayBetAmount}）`,
      `Exceeds daily limit: ${settings.daily_bet_limit} (used today: ${todayBetAmount})`,
    );
  }
  return null;
}
