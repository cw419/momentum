export interface ScheduledSession {
  chainId: string;
  scheduledAt: Date;
  expiresAt: Date;
  auxiliarySignal: string; // 记录使用的预约信号
}

export interface ActiveSession {
  id?: string;
  chainId: string;
  startedAt: Date;
  duration: number;
  isPaused: boolean;
  pausedAt?: Date;
  totalPausedTime: number;
  // 正向计时相关字段
  isForwardTimer?: boolean; // 是否为正向计时模式
  forwardElapsedTime?: number; // 正向计时已用时间（秒）
}

export interface CompletionHistory {
  chainId: string;
  completedAt: Date;
  duration: number;
  wasSuccessful: boolean;
  reasonForFailure?: string;
  // 实际用时相关字段
  actualDuration?: number; // 实际用时（分钟）
  isForwardTimed?: boolean; // 是否为正向计时任务
  // 任务完成描述和备注
  description?: string; // 任务完成描述
  notes?: string; // 备注
}
