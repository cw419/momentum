/**
 * ChainDetail 组件共享类型定义
 */

import { Chain, CompletionHistory } from '../../types';

export interface TranslationFn {
  (zh: string, en: string): string;
}

export interface ChainDetailViewProps {
  chain: Chain;
  recentHistory: CompletionHistory[];
  chainHistoryCount: number;
  successRate: number;
  showDeleteConfirm: boolean;
  language: 'zh' | 'en';
  locale: string;
  tr: TranslationFn;
  formatFailureReason: (reason: string) => string;
  onBack: () => void;
  onEdit: () => void;
  onDeleteClick: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
}

export interface HeaderProps {
  chainName: string;
  tr: TranslationFn;
  onBack: () => void;
  onEdit: () => void;
  onDeleteClick: () => void;
}

export interface MainStatsProps {
  chain: Chain;
  successRate: number;
  language: 'zh' | 'en';
  tr: TranslationFn;
}

export interface StatRowProps {
  label: string;
  value: string | number;
  mono?: boolean;
  success?: boolean;
  danger?: boolean;
  blue?: boolean;
}

export interface ExceptionsSectionProps {
  chain: Chain;
  tr: TranslationFn;
}

export interface DescriptionSectionProps {
  description: string;
  tr: TranslationFn;
}

export interface HistorySectionProps {
  recentHistory: CompletionHistory[];
  locale: string;
  language: 'zh' | 'en';
  tr: TranslationFn;
  formatFailureReason: (reason: string) => string;
}

export interface HistoryRecordProps {
  record: CompletionHistory;
  locale: string;
  language: 'zh' | 'en';
  tr: TranslationFn;
  formatFailureReason: (reason: string) => string;
}

export interface DeleteConfirmModalProps {
  chain: Chain;
  chainHistoryCount: number;
  successRate: number;
  language: 'zh' | 'en';
  tr: TranslationFn;
  onConfirm: () => void;
  onCancel: () => void;
}

export interface DeleteDataSummaryProps {
  chain: Chain;
  chainHistoryCount: number;
  successRate: number;
  language: 'zh' | 'en';
  tr: TranslationFn;
}

export interface DeleteDataCardProps {
  icon: React.ReactNode;
  title: string;
  items: Array<{ label: string; value: string | number; isChinese?: boolean }>;
}
