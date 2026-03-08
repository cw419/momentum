import type { Chain } from './chain';
import type { ExceptionRule, RuleUsageRecord } from './exception-rule';
import type {
  RSIPExecutionRecord,
  RSIPLibraryEntry,
  RSIPMeta,
  RSIPNode,
  RSIPNodeGroup,
  RSIPRunRecord,
} from './rsip';
import type { RSIPTaskLink } from './rsipIntegration';
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
  completionHistory: CompletionHistory[];
  // RSIP
  rsipNodes: RSIPNode[];
  rsipMeta: RSIPMeta;
  rsipExecutionRecords?: RSIPExecutionRecord[]; // 定式执行记录（严格模式）
  rsipGroups?: RSIPNodeGroup[]; // 国策组
  rsipPolicyLibrary?: RSIPLibraryEntry[]; // 国策库
  rsipRunHistory?: RSIPRunRecord[]; // 轮次历史
  rsipTaskLinks?: RSIPTaskLink[]; // 国策-任务映射
  // 任务用时统计
  taskTimeStats: TaskTimeStats[];
  // 例外规则系统
  exceptionRules: ExceptionRule[];
  ruleUsageRecords: RuleUsageRecord[];
}
