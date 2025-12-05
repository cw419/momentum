export interface Chain {
  id: string;
  parentId?: string; // 父任务ID，用于构建层级关系
  type: ChainType; // 任务类型/兵种
  sortOrder: number; // 在同一父任务下的排序
  name: string;
  trigger: string;
  duration: number; // in minutes
  description: string;
  currentStreak: number;
  auxiliaryStreak: number; // 辅助链连续成功记录
  totalCompletions: number;
  totalFailures: number;
  auxiliaryFailures: number; // 辅助链失败次数
  exceptions: string[];
  auxiliaryExceptions: string[]; // 辅助链例外规则
  // 辅助链设置
  auxiliarySignal: string; // 预约信号，如"打响指"、"设置闹钟"
  auxiliaryDuration: number; // 预约时长（分钟）
  auxiliaryCompletionTrigger: string; // 预约完成条件，通常与主链trigger相同
  // 任务群时间限定设置
  timeLimitHours?: number; // 时间限制（小时），仅在 type=group 时有效
  timeLimitExceptions: string[]; // 时间限制例外规则
  groupStartedAt?: Date; // 任务群开始时间
  groupExpiresAt?: Date; // 任务群过期时间
  // 无时长任务（手动结束）
  isDurationless?: boolean; // 为 true 时不倒计时，由用户手动结束
  createdAt: Date;
  lastCompletedAt?: Date;
}

export type ChainType = 
  | 'unit'          // 基础单元
  | 'group'         // 任务群容器
  | 'assault'       // 突击单元（学习、实验、论文）
  | 'recon'         // 侦查单元（信息搜集）
  | 'command'       // 指挥单元（制定计划）
  | 'special_ops'   // 特勤单元（处理杂事）
  | 'engineering'   // 工程单元（运动锻炼）
  | 'quartermaster'; // 炊事单元（备餐做饭）

// 任务树节点，用于前端渲染层级结构
export interface ChainTreeNode extends Chain {
  children: ChainTreeNode[];
  depth: number;
}

export interface ScheduledSession {
  chainId: string;
  scheduledAt: Date;
  expiresAt: Date;
  auxiliarySignal: string; // 记录使用的预约信号
}

export interface ActiveSession {
  chainId: string;
  startedAt: Date;
  duration: number;
  isPaused: boolean;
  pausedAt?: Date;
  totalPausedTime: number;
}

export interface CompletionHistory {
  chainId: string;
  completedAt: Date;
  duration: number;
  wasSuccessful: boolean;
  reasonForFailure?: string;
}

export type ViewState = 'dashboard' | 'editor' | 'focus' | 'detail' | 'group';

export interface AppState {
  chains: Chain[];
  scheduledSessions: ScheduledSession[];
  activeSession: ActiveSession | null;
  currentView: ViewState;
  editingChain: Chain | null;
  viewingChainId: string | null;
  completionHistory: CompletionHistory[];
}

export enum ExceptionRuleType {
  PAUSE_ONLY = 'pause_only',
  EARLY_COMPLETION_ONLY = 'early_completion_only',
  BOTH = 'both'
}

export type RuleScope = 'global' | 'chain';

export interface ExceptionRule {
  id: string;
  name: string;
  type: ExceptionRuleType;
  description?: string;
  scope: RuleScope;
  chainId?: string;
  createdAt: Date;
  lastUsedAt?: Date;
  usageCount: number;
  isActive: boolean;
  isArchived?: boolean;
}

export interface RuleUsageRecord {
  id: string;
  ruleId: string;
  chainId: string;
  sessionId: string;
  usedAt: Date;
  actionType: 'pause' | 'early_completion';
  taskElapsedTime: number;
  taskRemainingTime: number;
  pauseDuration?: number;
  autoResume?: boolean;
  ruleScope?: RuleScope;
}

export interface SessionContext {
  sessionId: string;
  chainId: string;
  chainName: string;
  startedAt: Date;
  elapsedTime: number;
  remainingTime: number;
  isDurationless: boolean;
}

export interface PauseOptions {
  duration?: number;
  autoResume?: boolean;
}

export interface RuleUsageStats {
  ruleId: string;
  totalUsage: number;
  pauseUsage: number;
  earlyCompletionUsage: number;
  lastUsedAt?: Date;
  averageTaskElapsedTime: number;
  mostUsedWithChains: Array<{ chainId: string; chainName: string; count: number }>;
}

export interface OverallUsageStats {
  totalRules: number;
  totalUsage: number;
  pauseUsage: number;
  earlyCompletionUsage: number;
  mostUsedRules: Array<{ ruleId: string; ruleName: string; count: number }>;
}

export interface ExceptionRuleStorage {
  rules: ExceptionRule[];
  usageRecords: RuleUsageRecord[];
  lastSyncAt: Date;
}

export enum ExceptionRuleError {
  STORAGE_ERROR = 'STORAGE_ERROR',
  RULE_NOT_FOUND = 'RULE_NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  DUPLICATE_RULE_NAME = 'DUPLICATE_RULE_NAME',
  INVALID_RULE_TYPE = 'INVALID_RULE_TYPE',
  RULE_TYPE_MISMATCH = 'RULE_TYPE_MISMATCH',
  DATA_INTEGRITY_ERROR = 'DATA_INTEGRITY_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  RULE_STATE_INCONSISTENT = 'RULE_STATE_INCONSISTENT'
}

export class ExceptionRuleException extends Error {
  type: ExceptionRuleError;
  cause?: unknown;

  constructor(type: ExceptionRuleError, message: string, cause?: unknown) {
    super(message);
    this.name = 'ExceptionRuleException';
    this.type = type;
    this.cause = cause;
  }
}

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export class EnhancedExceptionRuleException extends ExceptionRuleException {
  userFriendlyMessage: string;
  technicalMessage: string;
  context?: Record<string, unknown>;
  suggestedActions: string[];
  recoverable: boolean;
  severity: ErrorSeverity;
  metadata: Record<string, unknown>;

  constructor(
    type: ExceptionRuleError,
    message: string,
    context?: unknown,
    recoverable: boolean = true,
    recommendedActions: string[] = [],
    severity: ErrorSeverity = 'medium',
    userFriendlyMessage?: string,
    metadata: Record<string, unknown> = {}
  ) {
    super(type, message, context);
    this.name = 'EnhancedExceptionRuleException';
    this.userFriendlyMessage = userFriendlyMessage || message;
    this.technicalMessage = message;
    this.context = context as Record<string, unknown>;
    this.suggestedActions = recommendedActions;
    this.recoverable = recoverable;
    this.severity = severity;
    this.metadata = metadata;
  }

  static createUserFriendly(
    type: ExceptionRuleError,
    userMessage: string,
    technicalMessage: string,
    context?: Record<string, unknown>
  ): EnhancedExceptionRuleException {
    return new EnhancedExceptionRuleException(
      type,
      technicalMessage,
      context,
      true,
      [],
      'medium',
      userMessage,
      {}
    );
  }

  addSuggestedAction(action: string): this {
    this.suggestedActions.push(action);
    return this;
  }
}