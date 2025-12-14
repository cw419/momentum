import type { MomentumStorage } from './MomentumStorage';
import { storage as localStorageUtils } from '../utils/storage';
import { err, ok } from '../domain/result';
import type { AppError } from '../domain/errors';

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

  // Auth (not supported in local mode)
  getCurrentUser: async () => ok(null),
  waitForAuthentication: async () => ok({ user: null, isAuthenticated: false }),
  isUserAuthenticated: async () => ok(false),
  signUp: async () => err<AppError>({ code: 'NOT_SUPPORTED', message: 'Auth is not supported in local storage mode' }),
  signIn: async () => err<AppError>({ code: 'NOT_SUPPORTED', message: 'Auth is not supported in local storage mode' }),
  signOut: async () => err<AppError>({ code: 'NOT_SUPPORTED', message: 'Auth is not supported in local storage mode' }),
  onAuthStateChange: () => ok(() => {}),

  // User settings (not supported in local mode)
  getGamblingSettings: async () =>
    err<AppError>({ code: 'NOT_SUPPORTED', message: 'User settings are not supported in local storage mode' }),
  toggleGamblingMode: async () =>
    err<AppError>({ code: 'NOT_SUPPORTED', message: 'User settings are not supported in local storage mode' }),
  isGamblingModeEnabled: async () => ok(false),

  // Betting (not supported in local mode)
  createBettingSession: async () =>
    err<AppError>({ code: 'NOT_SUPPORTED', message: 'Betting is not supported in local storage mode' }),
  deleteBettingSession: async () =>
    err<AppError>({ code: 'NOT_SUPPORTED', message: 'Betting is not supported in local storage mode' }),
  completeTaskWithBetting: async () =>
    err<AppError>({ code: 'NOT_SUPPORTED', message: 'Betting is not supported in local storage mode' }),
  placeBet: async () => err<AppError>({ code: 'NOT_SUPPORTED', message: 'Betting is not supported in local storage mode' }),
  getUserAvailablePoints: async () =>
    err<AppError>({ code: 'NOT_SUPPORTED', message: 'Betting is not supported in local storage mode' }),
  getTodayBetAmount: async () =>
    err<AppError>({ code: 'NOT_SUPPORTED', message: 'Betting is not supported in local storage mode' }),

  // Daily check-in (not supported in local mode)
  performDailyCheckin: async () =>
    err<AppError>({ code: 'NOT_SUPPORTED', message: 'Daily check-in is not supported in local storage mode' }),
  getUserCheckinStats: async () =>
    err<AppError>({ code: 'NOT_SUPPORTED', message: 'Daily check-in is not supported in local storage mode' }),
};
