/**
 * @module useRsipDomain
 * @description RSIP（递归稳态迭代协议）管理的领域 Hook
 *
 * 职责：
 * - 打开 RSIP 视图
 * - 保存 RSIP 节点（国策/定式）
 * - 保存 RSIP 元数据（如每日添加限制）
 * - 【严格模式】标记定式执行/违反
 * - 【严格模式】记录国策树打开
 * - 【严格模式】计算约束力
 *
 * RSIP 是一种用于管理长期习惯和行为规范的系统，
 * 类似于"个人宪法"或"生活准则"。
 *
 * @see src/types/index.ts - RSIPNode, RSIPMeta, RSIPExecutionRecord 类型定义
 */
import type { Dispatch, SetStateAction } from 'react';
import type {
  AppState,
  RSIPMeta,
  RSIPNode,
  RSIPStabilityPhase,
  RSIPMode,
} from '../../types';
import type { MomentumStorage } from '../../storage/MomentumStorage';
import { getDescendantIds, getDescendantCount } from '../../utils/rsipTree';
import { logger } from '../../utils/logger';
import { toError } from '../../utils/errorHandling';

interface UseRsipDomainParams {
  setState: Dispatch<SetStateAction<AppState>>;
  storage: MomentumStorage;
}

export function useRsipDomain({ setState, storage }: UseRsipDomainParams) {
  const openRSIP = () => {
    setState((prev) => ({ ...prev, currentView: 'rsip' }));
  };

  const saveNodes = async (nodes: RSIPNode[]) => {
    setState((prev) => ({ ...prev, rsipNodes: nodes }));
    try {
      await storage.saveRSIPNodes(nodes);
    } catch (error) {
      logger.error(
        'RSIP',
        'Failed to save RSIP nodes',
        { nodeCount: nodes.length },
        toError(error),
      );
    }
  };

  const saveMeta = async (meta: RSIPMeta) => {
    // 乐观更新：先更新本地状态，确保 UI 立即响应
    setState((prev) => ({ ...prev, rsipMeta: meta }));
    try {
      await storage.saveRSIPMeta(meta);
    } catch (error) {
      // 保存失败时记录错误，但不回滚状态（允许用户继续操作）
      logger.error(
        'RSIP',
        'Failed to save RSIP meta',
        { meta },
        toError(error),
      );
    }
  };

  // === 严格模式方法 ===

  /** 获取当前 RSIP 模式 */
  const getMode = (meta: RSIPMeta): RSIPMode => {
    return meta.allowMultiplePerDay ? 'free' : 'strict';
  };

  /** 判断是否为严格模式 */
  const isStrictMode = (meta: RSIPMeta): boolean => {
    return !meta.allowMultiplePerDay;
  };

  /** 标记定式已执行 */
  const markExecuted = async (
    nodeId: string,
    nodes: RSIPNode[],
    _notes?: string,
  ): Promise<RSIPNode[]> => {
    const now = new Date();
    const updatedNodes = nodes.map((node) => {
      if (node.id !== nodeId) return node;

      const consecutiveExecutions = (node.consecutiveExecutions ?? 0) + 1;
      const totalExecutions = (node.totalExecutions ?? 0) + 1;

      // 计算稳态阶段升级
      let stabilityPhase = node.stabilityPhase ?? 'E0';
      let phaseStartedAt = node.phaseStartedAt;

      if (stabilityPhase === 'E0' && consecutiveExecutions >= 7) {
        stabilityPhase = 'E1';
        phaseStartedAt = now;
      } else if (stabilityPhase === 'E1' && consecutiveExecutions >= 21) {
        stabilityPhase = 'E2';
        phaseStartedAt = now;
      }

      return {
        ...node,
        lastExecutedAt: now,
        consecutiveExecutions,
        consecutiveViolations: 0, // 重置违反计数
        totalExecutions,
        stabilityPhase,
        phaseStartedAt,
      };
    });

    await saveNodes(updatedNodes);
    return updatedNodes;
  };

  /** 标记定式已违反（触发堆栈删除） */
  const markViolated = async (
    nodeId: string,
    nodes: RSIPNode[],
    _notes?: string,
  ): Promise<RSIPNode[]> => {
    // 获取要删除的节点ID（当前节点 + 所有子孙节点）
    const idsToDelete = new Set([nodeId, ...getDescendantIds(nodes, nodeId)]);

    // 过滤掉要删除的节点
    const updatedNodes = nodes.filter((node) => !idsToDelete.has(node.id));

    await saveNodes(updatedNodes);
    return updatedNodes;
  };

  /** 记录今日已打开国策树 */
  const recordTreeOpened = async (meta: RSIPMeta): Promise<RSIPMeta> => {
    const now = new Date();
    const today = now.toDateString();
    const lastOpened = meta.lastTreeOpenedAt?.toDateString();

    let treeOpenStreak = meta.treeOpenStreak ?? 0;

    if (lastOpened !== today) {
      // 检查是否连续（昨天打开过）
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);

      if (lastOpened === yesterday.toDateString()) {
        treeOpenStreak += 1;
      } else {
        treeOpenStreak = 1; // 重新开始计数
      }
    }

    const updatedMeta: RSIPMeta = {
      ...meta,
      lastTreeOpenedAt: now,
      treeOpenStreak,
    };

    await saveMeta(updatedMeta);
    return updatedMeta;
  };

  /** 检查今日是否已打开国策树 */
  const hasOpenedToday = (meta: RSIPMeta): boolean => {
    if (!meta.lastTreeOpenedAt) return false;
    return meta.lastTreeOpenedAt.toDateString() === new Date().toDateString();
  };

  /** 计算约束力（失败代价） */
  const calculateConstraintPower = (
    nodeId: string,
    nodes: RSIPNode[],
  ): { descendantCount: number; failureCost: number } => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return { descendantCount: 0, failureCost: 0 };

    const descendantCount = getDescendantCount(nodes, nodeId);

    // 稳态权重：E0=1, E1=2, E2=3
    const phaseWeight: Record<RSIPStabilityPhase, number> = {
      E0: 1,
      E1: 2,
      E2: 3,
    };
    const weight = phaseWeight[node.stabilityPhase ?? 'E0'];

    // 失败代价 = (子节点数 + 1) × 稳态权重
    const failureCost = (descendantCount + 1) * weight;

    return { descendantCount, failureCost };
  };

  /** 计算各阶段定式数量分布 */
  const calculatePhaseDistribution = (
    nodes: RSIPNode[],
  ): { E0: number; E1: number; E2: number } => {
    const distribution = { E0: 0, E1: 0, E2: 0 };
    for (const node of nodes) {
      const phase = node.stabilityPhase ?? 'E0';
      distribution[phase]++;
    }
    return distribution;
  };

  return {
    openRSIP,
    saveNodes,
    saveMeta,
    // 严格模式方法
    getMode,
    isStrictMode,
    markExecuted,
    markViolated,
    recordTreeOpened,
    hasOpenedToday,
    calculateConstraintPower,
    calculatePhaseDistribution,
  };
}
