import React from 'react';
import {
  CheckCircle,
  Dices,
  Loader2,
  Star,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react';
import type {
  BetAmountInputProps,
  BetButtonsProps,
  PointsInfoProps,
  TaskInfoProps,
  TranslationFn,
} from './types';

export const TaskInfo: React.FC<TaskInfoProps> = ({
  chainName,
  taskDuration,
  tr,
}) => (
  <div className="space-y-3 rounded-xl bg-gray-50 p-4 dark:bg-gray-700">
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <Target className="h-5 w-5 text-primary-500" />
        <span className="font-medium text-gray-900 dark:text-gray-100">
          {tr('任务链', 'Chain')}
        </span>
      </div>
      <span className="text-gray-700 dark:text-gray-300">{chainName}</span>
    </div>
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <Zap className="h-5 w-5 text-yellow-500" />
        <span className="font-medium text-gray-900 dark:text-gray-100">
          {tr('时长', 'Duration')}
        </span>
      </div>
      <span className="text-gray-700 dark:text-gray-300">
        {tr(`${taskDuration} 分钟`, `${taskDuration} min`)}
      </span>
    </div>
  </div>
);

export const PointsInfo: React.FC<PointsInfoProps> = ({
  availablePoints,
  todayBetAmount,
  tr,
}) => (
  <div className="grid grid-cols-2 gap-4">
    <div className="rounded-xl bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 dark:from-yellow-900/20 dark:to-yellow-800/20">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
            {tr('可用积分', 'Available')}
          </p>
          <p className="text-2xl font-bold text-yellow-800 dark:text-yellow-200">
            {availablePoints}
          </p>
        </div>
        <Star className="h-6 w-6 text-yellow-500" />
      </div>
    </div>

    <div className="rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 p-4 dark:from-blue-900/20 dark:to-blue-800/20">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
            {tr('今日已押', 'Bet today')}
          </p>
          <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">
            {todayBetAmount}
          </p>
        </div>
        <TrendingUp className="h-6 w-6 text-blue-500" />
      </div>
    </div>
  </div>
);

export const BetAmountInput: React.FC<BetAmountInputProps> = ({
  betAmount,
  availablePoints,
  language,
  tr,
  quickBetOptions,
  onBetAmountChange,
  onQuickBetAmount,
}) => (
  <div className="space-y-3">
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
      {tr('押注金额', 'Bet amount')}
    </label>
    <div className="relative">
      <input
        type="number"
        name="betAmount"
        min="1"
        max={availablePoints}
        value={betAmount}
        onChange={(e) => onBetAmountChange(e.target.value)}
        placeholder={tr('输入押注积分数', 'Enter points to bet')}
        aria-label={tr('押注金额', 'Bet amount')}
        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-500 transition-colors focus:border-transparent focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
      />
      {betAmount && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 transform text-sm text-gray-500 dark:text-gray-400">
          {language === 'zh' ? `≈ ${betAmount} 积分` : `≈ ${betAmount} pts`}
        </div>
      )}
    </div>

    {quickBetOptions.length > 0 && (
      <div className="flex flex-wrap gap-2">
        {quickBetOptions.map((amount) => (
          <button
            type="button"
            key={amount}
            onClick={() => onQuickBetAmount(amount)}
            aria-label={tr(
              `快速押注 ${amount} 积分`,
              `Quick bet ${amount} points`,
            )}
            className="focus-ring rounded-lg bg-gray-100 px-3 py-1 text-sm text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500"
          >
            {amount}
          </button>
        ))}
        {availablePoints > 0 && (
          <button
            type="button"
            onClick={() => onQuickBetAmount(availablePoints)}
            aria-label={tr(
              `押注全部 ${availablePoints} 积分`,
              `Bet all ${availablePoints} points`,
            )}
            className="focus-ring rounded-lg bg-primary-100 px-3 py-1 text-sm text-primary-700 transition-colors hover:bg-primary-200 dark:bg-primary-900/30 dark:text-primary-300 dark:hover:bg-primary-900/50"
          >
            {tr('全部', 'All')}
          </button>
        )}
      </div>
    )}
  </div>
);

export const ValidationError: React.FC<{ error: string }> = ({ error }) => (
  <div className="rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
    <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
  </div>
);

export const BettingRules: React.FC<{ tr: TranslationFn }> = ({ tr }) => (
  <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
    <div className="flex items-start space-x-3">
      <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500">
        <CheckCircle className="h-3 w-3 text-white" />
      </div>
      <div className="space-y-1 text-sm">
        <p className="font-medium text-blue-700 dark:text-blue-300">
          {tr('押注规则', 'Rules')}
        </p>
        <ul className="space-y-1 text-blue-600 dark:text-blue-400">
          <li>
            {tr(
              '• 任务成功完成：获得 1:1 奖励（双倍回报）',
              '• If completed: 1:1 payout (double return)',
            )}
          </li>
          <li>{tr('• 任务失败：损失押注积分', '• If failed: lose the bet')}</li>
          <li>
            {tr('• 每个任务会话只能押注一次', '• Only one bet per session')}
          </li>
        </ul>
      </div>
    </div>
  </div>
);

export const BetButtons: React.FC<BetButtonsProps> = ({
  betAmount,
  availablePoints,
  isPlacingBet,
  validationError,
  tr,
  onPlaceBet,
  onClose,
}) => {
  const isDisabled =
    isPlacingBet ||
    !betAmount ||
    validationError !== null ||
    availablePoints === 0;

  let primaryButtonContent: React.ReactNode;
  if (isPlacingBet) {
    primaryButtonContent = (
      <div className="flex items-center justify-center">
        <Loader2 className="mr-3 h-6 w-6 animate-spin" />
        {tr('押注中...', 'Placing bet...')}
      </div>
    );
  } else if (availablePoints === 0) {
    primaryButtonContent = tr('积分不足', 'Not enough points');
  } else {
    primaryButtonContent = (
      <div className="flex items-center justify-center">
        <Dices className="mr-3 h-6 w-6" />
        {tr('确认押注', 'Confirm bet')}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onPlaceBet}
        disabled={isDisabled}
        aria-label={tr('确认押注', 'Confirm bet')}
        className={`focus-ring w-full rounded-xl px-6 py-4 text-lg font-semibold transition duration-200 ${
          isDisabled
            ? 'cursor-not-allowed bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
            : 'transform bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg hover:scale-[1.02] hover:from-red-600 hover:to-orange-600 hover:shadow-xl active:scale-[0.98]'
        } `}
      >
        {primaryButtonContent}
      </button>

      <button
        type="button"
        onClick={onClose}
        aria-label={tr('取消押注', 'Cancel bet')}
        className="focus-ring w-full rounded-xl bg-gray-100 px-6 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
      >
        {tr('取消', 'Cancel')}
      </button>
    </div>
  );
};
