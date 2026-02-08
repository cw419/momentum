import type { ChainTreeNode } from '../../types';

/**
 * 获取所有顶层任务（用于仪表盘显示）
 * buildChainTree 已经返回了正确的根节点，无需再次过滤
 */
export const getTopLevelChains = (
  chainTree: ChainTreeNode[],
): ChainTreeNode[] => {
  // buildChainTree 函数已经正确构建了树结构，返回的就是根节点
  // 不需要再次过滤，直接返回即可
  return chainTree;
};
