import type { Chain } from './chain';
import type { ExceptionRule, RuleUsageRecord } from './exception-rule';
import type { RSIPExecutionRecord, RSIPMeta, RSIPNode } from './rsip';
import type {
  ActiveSession,
  CompletionHistory,
  ScheduledSession,
} from './session';
import type { TaskTimeStats } from './taskTimeStats';

export type ViewState =
  | 'dashboard'
  | 'editor'
  | 'focus'
  | 'detail'
  | 'group'
  | 'rsip'
  | 'taskgroup-editor';

export interface AppState {
  chains: Chain[];
  chainsRevision: number;
  scheduledSessions: ScheduledSession[];
  activeSession: ActiveSession | null;
  currentView: ViewState;
  editingChain: Chain | null;
  viewingChainId: string | null;
  completionHistory: CompletionHistory[];
  // RSIP
  rsipNodes: RSIPNode[];
  rsipMeta: RSIPMeta;
  rsipExecutionRecords?: RSIPExecutionRecord[]; // 定式执行记录（严格模式）
  // 任务用时统计
  taskTimeStats: TaskTimeStats[];
  // 例外规则系统
  exceptionRules: ExceptionRule[];
  ruleUsageRecords: RuleUsageRecord[];
}
