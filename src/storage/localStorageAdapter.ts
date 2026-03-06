import type { MomentumStorage } from './MomentumStorage';
import { storage as localStorageUtils } from '../utils/storage';
import { err, ok } from '../domain/result';
import type { AppError } from '../domain/errors';

const notSupported = (message: string) =>
  err<AppError>({ code: 'NOT_SUPPORTED', message });

const AUTH_NOT_SUPPORTED_MESSAGE =
  'Auth is not supported in local storage mode';
const USER_SETTINGS_NOT_SUPPORTED_MESSAGE =
  'User settings are not supported in local storage mode';
const BETTING_NOT_SUPPORTED_MESSAGE =
  'Betting is not supported in local storage mode';
const DAILY_CHECKIN_NOT_SUPPORTED_MESSAGE =
  'Daily check-in is not supported in local storage mode';

export const localStorageAdapter: MomentumStorage = {
  kind: 'local',

  // Chains
  getChains: async () => localStorageUtils.getChains(),
  saveChains: async (chains) => localStorageUtils.saveChains(chains),
  getActiveChains: async () => localStorageUtils.getActiveChains(),
  getDeletedChains: async () => localStorageUtils.getDeletedChains(),
  softDeleteChain: async (chainId) =>
    localStorageUtils.softDeleteChain(chainId),
  restoreChain: async (chainId) => localStorageUtils.restoreChain(chainId),
  permanentlyDeleteChain: async (chainId) =>
    localStorageUtils.permanentlyDeleteChain(chainId),
  cleanupExpiredDeletedChains: async (olderThanDays) =>
    localStorageUtils.cleanupExpiredDeletedChains(olderThanDays),

  // Scheduled sessions
  getScheduledSessions: async () => localStorageUtils.getScheduledSessions(),
  saveScheduledSessions: async (sessions) =>
    localStorageUtils.saveScheduledSessions(sessions),

  // Active session
  getActiveSession: async () => localStorageUtils.getActiveSession(),
  saveActiveSession: async (session) =>
    localStorageUtils.saveActiveSession(session),

  // Completion history
  getCompletionHistory: async () => localStorageUtils.getCompletionHistory(),
  saveCompletionHistory: async (history) =>
    localStorageUtils.saveCompletionHistory(history),

  // RSIP
  getRSIPNodes: async () => localStorageUtils.getRSIPNodes(),
  saveRSIPNodes: async (nodes) => localStorageUtils.saveRSIPNodes(nodes),
  getRSIPMeta: async () => localStorageUtils.getRSIPMeta(),
  saveRSIPMeta: async (meta) => localStorageUtils.saveRSIPMeta(meta),
  getRSIPGroups: async () => localStorageUtils.getRSIPGroups(),
  saveRSIPGroups: async (groups) => localStorageUtils.saveRSIPGroups(groups),
  getRSIPPolicyLibrary: async () => localStorageUtils.getRSIPPolicyLibrary(),
  saveRSIPPolicyLibrary: async (entries) =>
    localStorageUtils.saveRSIPPolicyLibrary(entries),
  getRSIPRunHistory: async () => localStorageUtils.getRSIPRunHistory(),
  saveRSIPRunHistory: async (records) =>
    localStorageUtils.saveRSIPRunHistory(records),
  getRSIPTaskLinks: async () => localStorageUtils.getRSIPTaskLinks(),
  saveRSIPTaskLinks: async (links) =>
    localStorageUtils.saveRSIPTaskLinks(links),
  getRSIPExecutionRecords: async () =>
    localStorageUtils.getRSIPExecutionRecords(),
  appendRSIPExecutionRecord: async (record) =>
    localStorageUtils.appendRSIPExecutionRecord(record),

  // Task time stats
  getTaskTimeStats: async () => localStorageUtils.getTaskTimeStats(),
  saveTaskTimeStats: async (stats) =>
    localStorageUtils.saveTaskTimeStats(stats),
  getLastCompletionTime: async (chainId) =>
    localStorageUtils.getLastCompletionTime(chainId),
  updateTaskTimeStats: async (chainId, actualDuration) =>
    localStorageUtils.updateTaskTimeStats(chainId, actualDuration),
  getTaskAverageTime: async (chainId) =>
    localStorageUtils.getTaskAverageTime(chainId),

  // Compatibility / maintenance
  migrateCompletionHistoryForTiming: async () =>
    localStorageUtils.migrateCompletionHistoryForTiming(),
  clearCache: () => localStorageUtils.clearCache(),

  // Auth (not supported in local mode)
  getCurrentUser: async () => ok(null),
  waitForAuthentication: async () => ok({ user: null, isAuthenticated: false }),
  isUserAuthenticated: async () => ok(false),
  signUp: async () => notSupported(AUTH_NOT_SUPPORTED_MESSAGE),
  signIn: async () => notSupported(AUTH_NOT_SUPPORTED_MESSAGE),
  signOut: async () => notSupported(AUTH_NOT_SUPPORTED_MESSAGE),
  onAuthStateChange: () => ok(() => {}),

  // User settings (not supported in local mode)
  getGamblingSettings: async () =>
    notSupported(USER_SETTINGS_NOT_SUPPORTED_MESSAGE),
  toggleGamblingMode: async () =>
    notSupported(USER_SETTINGS_NOT_SUPPORTED_MESSAGE),
  isGamblingModeEnabled: async () => ok(false),

  // Betting (not supported in local mode)
  createBettingSession: async () => notSupported(BETTING_NOT_SUPPORTED_MESSAGE),
  deleteBettingSession: async () => notSupported(BETTING_NOT_SUPPORTED_MESSAGE),
  completeTaskWithBetting: async () =>
    notSupported(BETTING_NOT_SUPPORTED_MESSAGE),
  placeBet: async () => notSupported(BETTING_NOT_SUPPORTED_MESSAGE),
  getUserAvailablePoints: async () =>
    notSupported(BETTING_NOT_SUPPORTED_MESSAGE),
  getTodayBetAmount: async () => notSupported(BETTING_NOT_SUPPORTED_MESSAGE),

  // Daily check-in (not supported in local mode)
  performDailyCheckin: async () =>
    notSupported(DAILY_CHECKIN_NOT_SUPPORTED_MESSAGE),
  getUserCheckinStats: async () =>
    notSupported(DAILY_CHECKIN_NOT_SUPPORTED_MESSAGE),

  // Pet (supported in local mode)
  getPetState: async () => localStorageUtils.getPetState(),
  savePetState: async (pet) => localStorageUtils.savePetState(pet),
};
