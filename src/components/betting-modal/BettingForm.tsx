import React from 'react';
import type { BettingFormProps } from './types';
import {
  BetAmountInput,
  BetButtons,
  BettingRules,
  PointsInfo,
  TaskInfo,
  ValidationError,
} from './BettingFormSections';

export const BettingForm: React.FC<BettingFormProps> = ({
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
    <TaskInfo chainName={chainName} taskDuration={taskDuration} tr={tr} />

    <PointsInfo
      availablePoints={availablePoints}
      todayBetAmount={todayBetAmount}
      tr={tr}
    />

    <BetAmountInput
      betAmount={betAmount}
      availablePoints={availablePoints}
      language={language}
      tr={tr}
      quickBetOptions={quickBetOptions}
      onBetAmountChange={onBetAmountChange}
      onQuickBetAmount={onQuickBetAmount}
    />

    {validationError && <ValidationError error={validationError} />}

    <BettingRules tr={tr} />

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
