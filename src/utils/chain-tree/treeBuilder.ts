import { Chain, ChainTreeNode } from '../../types';
import { isDev } from '../env';
import { performanceLogger } from '../performanceLogger';

/**
 * 验证链数据的完整性
 */
const validateChainData = (
  chains: Chain[],
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const ids = new Set<string>();

  for (const chain of chains) {
    // Check for required fields
    if (!chain.id) {
      errors.push(`链条缺少ID: ${JSON.stringify(chain)}`);
      continue;
    }

    if (!chain.name) {
      errors.push(`链条 ${chain.id} 缺少名称`);
    }

    // Check for duplicate IDs
    if (ids.has(chain.id)) {
      errors.push(`重复的链条ID: ${chain.id}`);
    }
    ids.add(chain.id);

    // Check for invalid parent references (will be handled in tree building)
    if (chain.parentId === chain.id) {
      errors.push(`链条 ${chain.id} (${chain.name}) 存在循环引用`);
    }
  }

  return { isValid: errors.length === 0, errors };
};

/**
 * 将扁平的链数组转换为树状结构
 */
export const buildChainTree = (chains: Chain[]): ChainTreeNode[] => {
  return performanceLogger.time('buildChainTree', () => {
    try {
      // Validate input data
      if (!Array.isArray(chains)) {
        performanceLogger.error('buildChainTree: 输入不是数组');
        return [];
      }

      if (chains.length === 0) {
        performanceLogger.debug('buildChainTree: 输入为空数组');
        return [];
      }

      // Validate chain data integrity
      const validation = validateChainData(chains);
      if (!validation.isValid) {
        performanceLogger.warn(
          'buildChainTree: 数据完整性检查发现问题:',
          validation.errors,
        );
        // Continue processing but log warnings
      }

      // 创建ID到节点的映射
      const nodeMap = new Map<string, ChainTreeNode>();

      performanceLogger.debugLazy('buildChainTree - input chains', () => ({
        chainCount: chains.length,
        chains: chains.map((c) => ({
          id: c.id,
          name: c.name,
          parentId: c.parentId,
          type: c.type,
        })),
      }));

      // 修复循环引用和其他数据问题
      const cleanedChains = chains
        .map((chain) => {
          if (!chain.id) {
            performanceLogger.error(`跳过无效链条（缺少ID）:`, chain);
            return null;
          }

          if (chain.parentId === chain.id) {
            performanceLogger.warn(
              `修复循环引用: 链条 ${chain.name} (${chain.id}) 的父节点是自己，重置为根节点`,
            );
            return { ...chain, parentId: undefined };
          }

          return chain;
        })
        .filter((chain): chain is Chain => chain !== null);

      // 初始化所有节点
      cleanedChains.forEach((chain) => {
        nodeMap.set(chain.id, {
          ...chain,
          children: [],
          depth: 0,
        });
      });

      const rootNodes: ChainTreeNode[] = [];

      // 构建树结构
      cleanedChains.forEach((chain) => {
        const node = nodeMap.get(chain.id)!;

        if (chain.parentId) {
          const parent = nodeMap.get(chain.parentId);
          if (parent) {
            parent.children.push(node);
            node.depth = parent.depth + 1;
            performanceLogger.debug(
              `节点 ${chain.name} 作为 ${parent.name} 的子节点`,
            );
          } else {
            // 父节点不存在，作为根节点处理
            performanceLogger.warn(
              `父节点 ${chain.parentId} 不存在，节点 ${chain.name} (${chain.id}) 将作为根节点处理`,
            );
            // Reset parentId to undefined and add to rootNodes
            node.parentId = undefined;
            rootNodes.push(node);
          }
        } else {
          performanceLogger.debug(`节点 ${chain.name} 是根节点`);
          rootNodes.push(node);
        }
      });

      // 对每个节点的子节点按 sortOrder 排序
      const sortChildren = (node: ChainTreeNode) => {
        node.children.sort((a, b) => a.sortOrder - b.sortOrder);
        node.children.forEach(sortChildren);
      };

      rootNodes.forEach(sortChildren);

      // 对根节点也进行排序
      rootNodes.sort((a, b) => a.sortOrder - b.sortOrder);

      if (isDev) {
        performanceLogger.debugLazy(
          'buildChainTree - root nodes built',
          () => ({
            rootNodeCount: rootNodes.length,
            roots: rootNodes.map((r) => ({
              id: r.id,
              name: r.name,
              childrenCount: r.children.length,
            })),
          }),
        );
      }

      // Final validation - ensure all input chains are represented in the tree
      const treeNodeIds = new Set<string>();
      const collectIds = (nodes: ChainTreeNode[]) => {
        nodes.forEach((node) => {
          treeNodeIds.add(node.id);
          collectIds(node.children);
        });
      };
      collectIds(rootNodes);

      const inputIds = new Set(cleanedChains.map((c) => c.id));
      const missingIds = [...inputIds].filter((id) => !treeNodeIds.has(id));

      if (missingIds.length > 0) {
        performanceLogger.error(
          'buildChainTree: 以下链条在树中丢失:',
          missingIds,
        );
      }

      return rootNodes;
    } catch (error) {
      performanceLogger.error('buildChainTree: 构建树时发生错误:', error);
      // Return empty array to prevent app crash
      return [];
    }
  }); // End performanceLogger.time
};
