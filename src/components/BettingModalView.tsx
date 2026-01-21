/**
 * BettingModalView - 纯展示组件
 */

import React from 'react';
import { X, Dices, Star, TrendingUp, AlertCircle, Loader2, CheckCircle, Target, Zap } from 'lucide-react';

export interface BettingModalViewProps {
  isOpen: boolean;
  chainName: string;
  taskDuration: number;
  language: 'zh' | 'en';
  tr: (zh: string, en: string) => string;

  // 状态
  betAmount: string;
  availablePoints: number;
  todayBetAmount: number;
  isPlacingBet: boolean;
  isLoading: boolean;
  error: string | null;
  validationError: string | null;
  successMessage: string | null;
  quickBetOptions: number[];

  // 事件处理器
  onClose: () => void;
  onBetAmountChange: (value: string) => void;
  onQuickBetAmount: (amount: number) => void;
  onPlaceBet: () => void;
  onReload: () => void;

  // Refs
  focusTrapRef: React.RefObject<HTMLDivElement>;
}

const BettingModalViewComponent: React.FC<BettingModalViewProps> = ({
  isOpen,
  chainName,
  taskDuration,
  language,
  tr,
  betAmount,
  availablePoints,
  todayBetAmount,
  isPlacingBet,
  isLoading,
  error,
  validationError,
  successMessage,
  quickBetOptions,
  onClose,
  onBetAmountChange,
  onQuickBetAmount,
  onPlaceBet,
  onReload,
  focusTrapRef,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div
        ref={focusTrapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="betting-modal-title"
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md">
        {/* Header */}
        <Header tr={tr} onClose={onClose} />

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <LoadingState tr={tr} />
          ) : error ? (
            <ErrorState error={error} tr={tr} onReload={onReload} />
          ) : successMessage ? (
            <SuccessState successMessage={successMessage} tr={tr} />
          ) : (
            <BettingForm
              chainName={chainName}
              taskDuration={taskDuration}
              language={language}
              tr={tr}
              betAmount={betAmount}
              availablePoints={availablePoints}
              todayBetAmount={todayBetAmount}
              isPlacingBet={isPlacingBet}
              validationError={validationError}
              quickBetOptions={quickBetOptions}
              onBetAmountChange={onBetAmountChange}
              onQuickBetAmount={onQuickBetAmount}
              onPlaceBet={onPlaceBet}
              onClose={onClose}
            />
          )}
        </div>
      </div>
    </div>
  );
};

interface HeaderProps {
  tr: (zh: string, en: string) => string;
  onClose: () => void;
}

const Header: React.FC<HeaderProps> = ({ tr, onClose }) => (
  <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
    <div className="flex items-center space-x-3">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg">
        <Dices className="text-white" size={20} />
      </div>
      <h2 id="betting-modal-title" className="text-xl font-bold text-gray-900 dark:text-gray-100">
        {tr('任务押注', 'Task bet')}
      </h2>
    </div>
    <button
      type="button"
      onClick={onClose}
      aria-label={tr('关闭', 'Close')}
      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors focus-ring rounded"
    >
      <X size={24} />
    </button>
  </div>
);

const LoadingState: React.FC<{ tr: (zh: string, en: string) => string }> = ({ tr }) => (
  <div className="text-center py-8">
    <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto mb-3" />
    <p className="text-gray-600 dark:text-gray-300">{tr('加载押注数据...', 'Loading betting data...')}</p>
  </div>
);

interface ErrorStateProps {
  error: string;
  tr: (zh: string, en: string) => string;
  onReload: () => void;
}

const ErrorState: React.FC<ErrorStateProps> = ({ error, tr, onReload }) => (
  <div className="text-center py-8">
    <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
    <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
    <button
      type="button"
      onClick={onReload}
      aria-label={tr('重新加载数据', 'Reload data')}
      className="text-primary-500 hover:text-primary-600 font-medium transition-colors focus-ring rounded"
    >
      {tr('重新加载', 'Reload')}
    </button>
  </div>
);

interface SuccessStateProps {
  successMessage: string;
  tr: (zh: string, en: string) => string;
}

const SuccessState: React.FC<SuccessStateProps> = ({ successMessage, tr }) => (
  <div className="text-center py-8">
    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
    <p className="text-green-700 dark:text-green-300 font-medium text-lg mb-2">
      {tr('押注成功！', 'Bet placed!')}
    </p>
    <p className="text-gray-600 dark:text-gray-400 text-sm">
      {successMessage}
    </p>
  </div>
);

interface BettingFormProps {
  chainName: string;
  taskDuration: number;
  language: 'zh' | 'en';
  tr: (zh: string, en: string) => string;
  betAmount: string;
  availablePoints: number;
  todayBetAmount: number;
  isPlacingBet: boolean;
  validationError: string | null;
  quickBetOptions: number[];
  onBetAmountChange: (value: string) => void;
  onQuickBetAmount: (amount: number) => void;
  onPlaceBet: () => void;
  onClose: () => void;
}

const BettingForm: React.FC<BettingFormProps> = ({
  chainName,
  taskDuration,
  language,
  tr,
  betAmount,
  availablePoints,
  todayBetAmount,
  isPlacingBet,
  validationError,
  quickBetOptions,
  onBetAmountChange,
  onQuickBetAmount,
  onPlaceBet,
  onClose,
}) => (
  <div className="space-y-6">
    {/* 任务信息 */}
    <TaskInfo chainName={chainName} taskDuration={taskDuration} tr={tr} />

    {/* 积分信息 */}
    <PointsInfo availablePoints={availablePoints} todayBetAmount={todayBetAmount} tr={tr} />

    {/* 押注金额输入 */}
    <BetAmountInput
      betAmount={betAmount}
      availablePoints={availablePoints}
      language={language}
      tr={tr}
      quickBetOptions={quickBetOptions}
      onBetAmountChange={onBetAmountChange}
      onQuickBetAmount={onQuickBetAmount}
    />

    {/* 验证错误 */}
    {validationError && <ValidationError error={validationError} />}

    {/* 押注规则提示 */}
    <BettingRules tr={tr} />

    {/* 押注按钮 */}
    <BetButtons
      betAmount={betAmount}
      availablePoints={availablePoints}
      isPlacingBet={isPlacingBet}
      validationError={validationError}
      tr={tr}
      onPlaceBet={onPlaceBet}
      onClose={onClose}
    />
  </div>
);

interface TaskInfoProps {
  chainName: string;
  taskDuration: number;
  tr: (zh: string, en: string) => string;
}

const TaskInfo: React.FC<TaskInfoProps> = ({ chainName, taskDuration, tr }) => (
  <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 space-y-3">
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <Target className="w-5 h-5 text-primary-500" />
        <span className="font-medium text-gray-900 dark:text-gray-100">{tr('任务链', 'Chain')}</span>
      </div>
      <span className="text-gray-700 dark:text-gray-300">{chainName}</span>
    </div>
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <Zap className="w-5 h-5 text-yellow-500" />
        <span className="font-medium text-gray-900 dark:text-gray-100">{tr('时长', 'Duration')}</span>
      </div>
      <span className="text-gray-700 dark:text-gray-300">{tr(`${taskDuration} 分钟`, `${taskDuration} min`)}</span>
    </div>
  </div>
);

interface PointsInfoProps {
  availablePoints: number;
  todayBetAmount: number;
  tr: (zh: string, en: string) => string;
}

const PointsInfo: React.FC<PointsInfoProps> = ({ availablePoints, todayBetAmount, tr }) => (
  <div className="grid grid-cols-2 gap-4">
    <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-yellow-700 dark:text-yellow-300 font-medium">{tr('可用积分', 'Available')}</p>
          <p className="text-2xl font-bold text-yellow-800 dark:text-yellow-200">{availablePoints}</p>
        </div>
        <Star className="w-6 h-6 text-yellow-500" />
      </div>
    </div>

    <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">{tr('今日已押', 'Bet today')}</p>
          <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">{todayBetAmount}</p>
        </div>
        <TrendingUp className="w-6 h-6 text-blue-500" />
      </div>
    </div>
  </div>
);

interface BetAmountInputProps {
  betAmount: string;
  availablePoints: number;
  language: 'zh' | 'en';
  tr: (zh: string, en: string) => string;
  quickBetOptions: number[];
  onBetAmountChange: (value: string) => void;
  onQuickBetAmount: (amount: number) => void;
}

const BetAmountInput: React.FC<BetAmountInputProps> = ({
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
        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
      />
      {betAmount && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">
          {language === 'zh' ? `→ ${betAmount} 积分` : `→ ${betAmount} pts`}
        </div>
      )}
    </div>

    {/* 快速选择按钮 */}
    {quickBetOptions.length > 0 && (
      <div className="flex flex-wrap gap-2">
        {quickBetOptions.map(amount => (
          <button
            type="button"
            key={amount}
            onClick={() => onQuickBetAmount(amount)}
            aria-label={tr(`快速押注 ${amount} 积分`, `Quick bet ${amount} points`)}
            className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 rounded-lg transition-colors focus-ring"
          >
            {amount}
          </button>
        ))}
        {availablePoints > 0 && (
          <button
            type="button"
            onClick={() => onQuickBetAmount(availablePoints)}
            aria-label={tr(`押注全部 ${availablePoints} 积分`, `Bet all ${availablePoints} points`)}
            className="px-3 py-1 text-sm bg-primary-100 dark:bg-primary-900/30 hover:bg-primary-200 dark:hover:bg-primary-900/50 text-primary-700 dark:text-primary-300 rounded-lg transition-colors focus-ring"
          >
            {tr('全部', 'All')}
          </button>
        )}
      </div>
    )}
  </div>
);

const ValidationError: React.FC<{ error: string }> = ({ error }) => (
  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
    <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
  </div>
);

const BettingRules: React.FC<{ tr: (zh: string, en: string) => string }> = ({ tr }) => (
  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
    <div className="flex items-start space-x-3">
      <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center mt-0.5">
        <CheckCircle className="w-3 h-3 text-white" />
      </div>
      <div className="space-y-1 text-sm">
        <p className="text-blue-700 dark:text-blue-300 font-medium">{tr('押注规则', 'Rules')}</p>
        <ul className="space-y-1 text-blue-600 dark:text-blue-400">
          <li>{tr('• 任务成功完成：获得 1:1 奖励（双倍回报）', '• If completed: 1:1 payout (double return)')}</li>
          <li>{tr('• 任务失败：损失押注积分', '• If failed: lose the bet')}</li>
          <li>{tr('• 每个任务会话只能押注一次', '• Only one bet per session')}</li>
        </ul>
      </div>
    </div>
  </div>
);

interface BetButtonsProps {
  betAmount: string;
  availablePoints: number;
  isPlacingBet: boolean;
  validationError: string | null;
  tr: (zh: string, en: string) => string;
  onPlaceBet: () => void;
  onClose: () => void;
}

const BetButtons: React.FC<BetButtonsProps> = ({
  betAmount,
  availablePoints,
  isPlacingBet,
  validationError,
  tr,
  onPlaceBet,
  onClose,
}) => {
  const isDisabled = isPlacingBet || !betAmount || validationError !== null || availablePoints === 0;

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onPlaceBet}
        disabled={isDisabled}
        aria-label={tr('确认押注', 'Confirm bet')}
        className={`
          w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200 focus-ring
          ${isDisabled
            ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]'
          }
        `}
      >
        {isPlacingBet ? (
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin mr-3" />
            {tr('押注中...', 'Placing bet...')}
          </div>
        ) : availablePoints === 0 ? (
          tr('积分不足', 'Not enough points')
        ) : (
          <div className="flex items-center justify-center">
            <Dices className="w-6 h-6 mr-3" />
            {tr('确认押注', 'Confirm bet')}
          </div>
        )}
      </button>

      <button
        type="button"
        onClick={onClose}
        aria-label={tr('取消押注', 'Cancel bet')}
        className="w-full py-3 px-6 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors focus-ring"
      >
        {tr('取消', 'Cancel')}
      </button>
    </div>
  );
};

export const BettingModalView = React.memo(BettingModalViewComponent);
