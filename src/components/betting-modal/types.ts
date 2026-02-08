export type LocalizedLanguage = 'zh' | 'en';
export type TranslationFn = (zh: string, en: string) => string;

export interface BettingFormProps {
  chainName: string;
  taskDuration: number;
  language: LocalizedLanguage;
  tr: TranslationFn;
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

export interface TaskInfoProps {
  chainName: string;
  taskDuration: number;
  tr: TranslationFn;
}

export interface PointsInfoProps {
  availablePoints: number;
  todayBetAmount: number;
  tr: TranslationFn;
}

export interface BetAmountInputProps {
  betAmount: string;
  availablePoints: number;
  language: LocalizedLanguage;
  tr: TranslationFn;
  quickBetOptions: number[];
  onBetAmountChange: (value: string) => void;
  onQuickBetAmount: (amount: number) => void;
}

export interface BetButtonsProps {
  betAmount: string;
  availablePoints: number;
  isPlacingBet: boolean;
  validationError: string | null;
  tr: TranslationFn;
  onPlaceBet: () => void;
  onClose: () => void;
}
