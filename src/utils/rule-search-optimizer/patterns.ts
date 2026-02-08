import { ExceptionRuleType } from '../../types';

export function getCommonPatterns(actionType: ExceptionRuleType): string[] {
  const pausePatterns = [
    '上厕所',
    '喝水',
    '接电话',
    '休息',
    '吃饭',
    '开会',
    '紧急事务',
    '家庭事务',
    '健康问题',
    '技术故障',
  ];

  const completionPatterns = [
    '任务完成',
    '提前结束',
    '目标达成',
    '紧急情况',
    '优先级变更',
    '资源不足',
    '外部依赖',
    '计划调整',
  ];

  return actionType === ExceptionRuleType.PAUSE_ONLY
    ? pausePatterns
    : completionPatterns;
}

export function getCompletionPatterns(partial: string): string[] {
  const patterns: Record<string, string[]> = {
    上: ['上厕所', '上班', '上课'],
    喝: ['喝水', '喝茶', '喝咖啡'],
    接: ['接电话', '接客户', '接孩子'],
    开: ['开会', '开车', '开发'],
    紧: ['紧急事务', '紧急电话', '紧急会议'],
    家: ['家庭事务', '家人电话', '家里有事'],
    技: ['技术故障', '技术支持', '技术讨论'],
    任: ['任务完成', '任务调整', '任务优先级'],
    提: ['提前结束', '提前完成', '提前离开'],
    目: ['目标达成', '目标调整', '目标变更'],
  };

  return patterns[partial] || [];
}
