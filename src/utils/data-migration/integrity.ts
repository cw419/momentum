import { storage } from '../storage';
import { getErrorMessage } from '../errorMessage';

export async function validateDataIntegrity(): Promise<{ isValid: boolean; issues: string[] }> {
  const issues: string[] = [];

  try {
    const chains = storage.getChains();
    chains.forEach((chain, index) => {
      if (!chain.id) {
        issues.push(`链条 ${index} 缺少ID`);
      }
      if (!chain.name) {
        issues.push(`链条 ${chain.id} 缺少名称`);
      }
      if (chain.parentId === chain.id) {
        issues.push(`链条 ${chain.id} 存在循环引用`);
      }
    });

    const history = storage.getCompletionHistory();
    history.forEach((record, index) => {
      if (!record.chainId) {
        issues.push(`历史记录 ${index} 缺少链条ID`);
      }
      if (!record.completedAt) {
        issues.push(`历史记录 ${index} 缺少完成时间`);
      }
      if (record.duration < 0) {
        issues.push(`历史记录 ${index} 时长为负数`);
      }
    });

    const stats = storage.getTaskTimeStats();
    stats.forEach((stat, index) => {
      if (!stat.chainId) {
        issues.push(`用时统计 ${index} 缺少链条ID`);
      }
      if (stat.totalCompletions < 0) {
        issues.push(`用时统计 ${stat.chainId} 完成次数为负数`);
      }
      if (stat.totalTime < 0) {
        issues.push(`用时统计 ${stat.chainId} 总时间为负数`);
      }
    });
  } catch (error) {
    issues.push(`验证数据完整性时出错: ${getErrorMessage(error)}`);
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

