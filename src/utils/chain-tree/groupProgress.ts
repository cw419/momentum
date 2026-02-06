import type { ChainTreeNode } from '../../types';

/**
 * 获取任务群的完成进度（基于重复次数）
 * 注意：所有非 group 类型的节点都视为“可执行单元”
 */
export const getGroupProgress = (group: ChainTreeNode): { completed: number; total: number } => {
  if (group.type !== 'group') {
    const requiredRepeats = group.taskRepeatCount || 1;
    const completedRepeats = Math.min(group.currentStreak, requiredRepeats);
    return { completed: completedRepeats, total: requiredRepeats };
  }

  let completed = 0;
  let total = 0;

  group.children.forEach((child) => {
    const progress = getGroupProgress(child);
    completed += progress.completed;
    total += progress.total;
  });

  return { completed, total };
};

/**
 * 获取任务群的单元完成进度（基于单元数量，更直观）
 * 注意：所有非 group 类型都算作一个“单元”
 */
export const getGroupUnitProgress = (group: ChainTreeNode): { completed: number; total: number } => {
  if (group.type !== 'group') {
    const requiredRepeats = group.taskRepeatCount || 1;
    const isCompleted = group.currentStreak >= requiredRepeats;
    return { completed: isCompleted ? 1 : 0, total: 1 };
  }

  let completed = 0;
  let total = 0;

  group.children.forEach((child) => {
    const progress = getGroupUnitProgress(child);
    completed += progress.completed;
    total += progress.total;
  });

  return { completed, total };
};

/**
 * 获取任务群中下一个待执行的单元
 * 非 group 类型都可执行
 */
export const getNextUnitInGroup = (group: ChainTreeNode): ChainTreeNode | null => {
  if (group.type !== 'group') {
    const requiredRepeats = group.taskRepeatCount || 1;
    return group.currentStreak < requiredRepeats ? group : null;
  }

  // 对于任务群，按照 sortOrder 查找第一个未完成的子节点（递归）
  for (const child of group.children) {
    const nextUnit = getNextUnitInGroup(child);
    if (nextUnit) {
      return nextUnit;
    }
  }

  return null;
};

/**
 * 检查任务群中的所有任务是否都已完成其重复次数
 * 非 group 类型都视作任务单元
 */
export const isGroupFullyCompleted = (groupNode: ChainTreeNode): boolean => {
  if (groupNode.type !== 'group') {
    const requiredRepeats = groupNode.taskRepeatCount || 1;
    return groupNode.currentStreak >= requiredRepeats;
  }

  // 对于任务群，检查所有子任务是否都已完成
  return groupNode.children.every((child) => isGroupFullyCompleted(child));
};

