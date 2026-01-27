/**
 * ChainCard 组件类型定义
 */

import type { Chain, ScheduledSession, ChainTreeNode } from '../../types';
import type { getChainTypeConfig } from '../../utils/chainTree';

export type ChainTypeConfig = ReturnType<typeof getChainTypeConfig>;

export interface ChainCardProps {
  chain: Chain | ChainTreeNode;
  scheduledSession?: ScheduledSession;
  onStartChain: (chainId: string) => void;
  onScheduleChain: (chainId: string) => void;
  onViewDetail: (chainId: string) => void;
  onCancelScheduledSession?: (chainId: string) => void;
  onCompleteBooking?: (chainId: string) => void;
  onDelete: (chainId: string) => void;
}

export interface ChainCardViewProps {
  chain: Chain | ChainTreeNode;
  typeConfig: ChainTypeConfig;
  language: 'zh' | 'en';
  tr: (zh: string, en: string) => string;

  // 状态
  timeRemaining: number;
  isScheduled: boolean;
  showMenu: boolean;
  showDeleteConfirm: boolean;
  lastCompletionTime: number | null;
  scheduledSession?: ScheduledSession;

  // 事件处理器
  onViewDetail: () => void;
  onStartChain: () => void;
  onScheduleChain: () => void;
  onCompleteBooking: () => void;
  onCancelScheduledSession: () => void;
  onToggleMenu: () => void;
  onShowDeleteConfirm: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;

  // Refs
  deleteDialogRef: React.RefObject<HTMLDivElement>;
}
