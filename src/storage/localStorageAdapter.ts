import type { MomentumStorage } from './MomentumStorage';
import { storage as localStorageUtils } from '../utils/storage';

export const localStorageAdapter: MomentumStorage = {
  kind: 'local',

  // Chains
  getChains: async () => localStorageUtils.getChains(),
  saveChains: async (chains) => localStorageUtils.saveChains(chains),
  getActiveChains: async () => localStorageUtils.getActiveChains(),
  getDeletedChains: async () => localStorageUtils.getDeletedChains(),
  softDeleteChain: async (chainId) => localStorageUtils.softDeleteChain(chainId),
  restoreChain: async (chainId) => localStorageUtils.restoreChain(chainId),
  permanentlyDeleteChain: async (chainId) => localStorageUtils.permanentlyDeleteChain(chainId),
  cleanupExpiredDeletedChains: async (olderThanDays) =>
    localStorageUtils.cleanupExpiredDeletedChains(olderThanDays),

  // Scheduled sessions
  getScheduledSessions: async () => localStorageUtils.getScheduledSessions(),
  saveScheduledSessions: async (sessions) => localStorageUtils.saveScheduledSessions(sessions),

  // Active session
  getActiveSession: async () => localStorageUtils.getActiveSession(),
  saveActiveSession: async (session) => localStorageUtils.saveActiveSession(session),

  // Completion history
  getCompletionHistory: async () => localStorageUtils.getCompletionHistory(),
  saveCompletionHistory: async (history) => localStorageUtils.saveCompletionHistory(history),

  // RSIP
  getRSIPNodes: async () => localStorageUtils.getRSIPNodes(),
  saveRSIPNodes: async (nodes) => localStorageUtils.saveRSIPNodes(nodes),
  getRSIPMeta: async () => localStorageUtils.getRSIPMeta(),
  saveRSIPMeta: async (meta) => localStorageUtils.saveRSIPMeta(meta),

  // Task time stats
  getTaskTimeStats: async () => localStorageUtils.getTaskTimeStats(),
  saveTaskTimeStats: async (stats) => localStorageUtils.saveTaskTimeStats(stats),
  getLastCompletionTime: async (chainId) => localStorageUtils.getLastCompletionTime(chainId),
  updateTaskTimeStats: async (chainId, actualDuration) =>
    localStorageUtils.updateTaskTimeStats(chainId, actualDuration),
  getTaskAverageTime: async (chainId) => localStorageUtils.getTaskAverageTime(chainId),

  // Compatibility / maintenance
  migrateCompletionHistoryForTiming: async () => localStorageUtils.migrateCompletionHistoryForTiming(),
  clearCache: () => localStorageUtils.clearCache(),
};
