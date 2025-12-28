/**
 * @module useRsipDomain
 * @description RSIP（递归稳态迭代协议）管理的领域 Hook
 *
 * 职责：
 * - 打开 RSIP 视图
 * - 保存 RSIP 节点（国策/定式）
 * - 保存 RSIP 元数据（如每日添加限制）
 *
 * RSIP 是一种用于管理长期习惯和行为规范的系统，
 * 类似于"个人宪法"或"生活准则"。
 *
 * @see src/types/index.ts - RSIPNode, RSIPMeta 类型定义
 */
import type { Dispatch, SetStateAction } from 'react';
import type { AppState, RSIPMeta, RSIPNode } from '../../types';
import type { MomentumStorage } from '../../storage/MomentumStorage';

interface UseRsipDomainParams {
  setState: Dispatch<SetStateAction<AppState>>;
  storage: MomentumStorage;
}

export function useRsipDomain({ setState, storage }: UseRsipDomainParams) {
  const openRSIP = () => {
    setState(prev => ({ ...prev, currentView: 'rsip' }));
  };

  const saveNodes = async (nodes: RSIPNode[]) => {
    await storage.saveRSIPNodes(nodes);
    setState(prev => ({ ...prev, rsipNodes: nodes }));
  };

  const saveMeta = async (meta: RSIPMeta) => {
    await storage.saveRSIPMeta(meta);
    setState(prev => ({ ...prev, rsipMeta: meta }));
  };

  return { openRSIP, saveNodes, saveMeta };
}

