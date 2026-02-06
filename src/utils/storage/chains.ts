import type { Chain, DeletedChain } from '../../types';
import { collectDescendantIds } from './chainHierarchy';
import { STORAGE_KEYS } from './keys';

interface RawChainData {
  auxiliaryStreak?: number;
  auxiliaryFailures?: number;
  auxiliaryExceptions?: unknown[];
  deletedAt?: string | null;
  createdAt: string;
  lastCompletedAt?: string;
}

export function getChains(): Chain[] {
  const data = localStorage.getItem(STORAGE_KEYS.CHAINS);
  if (!data) return [];

  return JSON.parse(data).map((chain: RawChainData & Record<string, unknown>) => ({
    ...chain,
    auxiliaryStreak: chain.auxiliaryStreak || 0,
    auxiliaryFailures: chain.auxiliaryFailures || 0,
    auxiliaryExceptions: chain.auxiliaryExceptions || [],
    deletedAt: chain.deletedAt ? new Date(chain.deletedAt) : null,
    createdAt: new Date(chain.createdAt),
    lastCompletedAt: chain.lastCompletedAt ? new Date(chain.lastCompletedAt) : undefined,
  }));
}

export function saveChains(chains: Chain[]): void {
  localStorage.setItem(STORAGE_KEYS.CHAINS, JSON.stringify(chains));
}

export function getActiveChains(): Chain[] {
  return getChains().filter((chain) => chain.deletedAt == null);
}

export function getDeletedChains(): DeletedChain[] {
  return getChains()
    .filter((chain) => chain.deletedAt != null)
    .map((chain) => ({ ...chain, deletedAt: chain.deletedAt! }))
    .sort((a, b) => b.deletedAt.getTime() - a.deletedAt.getTime());
}

export function softDeleteChain(chainId: string): void {
  const chains = getChains();
  const descendants = collectDescendantIds(chainId, chains);
  const targets = new Set([chainId, ...descendants]);

  const updatedChains = chains.map((chain) => {
    if (targets.has(chain.id)) {
      return { ...chain, deletedAt: new Date() };
    }
    return chain;
  });

  saveChains(updatedChains);
}

export function restoreChain(chainId: string): void {
  const chains = getChains();
  const descendants = collectDescendantIds(chainId, chains);
  const targets = new Set([chainId, ...descendants]);

  const updatedChains = chains.map((chain) => {
    if (targets.has(chain.id)) {
      return { ...chain, deletedAt: null };
    }
    return chain;
  });

  saveChains(updatedChains);
}

export function permanentlyDeleteChain(chainId: string): void {
  const chains = getChains();
  const descendants = collectDescendantIds(chainId, chains);
  const targets = new Set([chainId, ...descendants]);

  const updatedChains = chains.filter((chain) => !targets.has(chain.id));
  saveChains(updatedChains);
}

export function cleanupExpiredDeletedChains(olderThanDays: number = 30): number {
  const chains = getChains();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  const chainsToDelete = chains.filter((chain) => chain.deletedAt && chain.deletedAt < cutoffDate);
  const remainingChains = chains.filter((chain) => !chain.deletedAt || chain.deletedAt >= cutoffDate);

  saveChains(remainingChains);
  return chainsToDelete.length;
}

