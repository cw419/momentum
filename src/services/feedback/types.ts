/**
 * 用户反馈系统类型定义
 */

export interface FeedbackMessage {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success' | 'loading';
  title: string;
  message: string;
  actions?: FeedbackAction[];
  persistent?: boolean;
  autoHide?: boolean;
  duration?: number;
  timestamp: Date;
}

export interface FeedbackAction {
  id: string;
  label: string;
  type: 'primary' | 'secondary' | 'danger';
  handler: () => void | Promise<void>;
}

export interface ProgressInfo {
  operation: string;
  progress?: number;
  message?: string;
  isIndeterminate?: boolean;
}

export type MessageListener = (messages: FeedbackMessage[]) => void;
export type ProgressListener = (progress: ProgressInfo | null) => void;
