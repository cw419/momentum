// 任务用时统计接口
export interface TaskTimeStats {
  chainId: string;
  lastCompletionTime?: number; // 上次完成用时（分钟）
  averageCompletionTime?: number; // 平均完成用时（分钟）
  totalCompletions: number; // 总完成次数
  totalTime: number; // 总用时（分钟）
}
