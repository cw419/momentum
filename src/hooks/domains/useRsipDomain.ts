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

