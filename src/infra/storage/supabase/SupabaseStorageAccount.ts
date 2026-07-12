import type {
  AuthGateway,
  BettingGateway,
  CheckinGateway,
  PetStore,
  UserSettingsGateway,
} from '../../../storage/ports';
import { storage as localStorageUtils } from '../../../utils/storage';
import * as authApi from './auth';
import * as bettingApi from './betting';
import * as checkinApi from './checkin';
import { SupabaseStorageRsip } from './SupabaseStorageRsip';
import * as userSettingsApi from './userSettings';

export abstract class SupabaseStorageAccount
  extends SupabaseStorageRsip
  implements
    AuthGateway,
    UserSettingsGateway,
    BettingGateway,
    CheckinGateway,
    PetStore
{
  getCurrentUser: AuthGateway['getCurrentUser'] = () =>
    authApi.getCurrentUser();
  waitForAuthentication: AuthGateway['waitForAuthentication'] = (maxWaitTime) =>
    authApi.waitForAuthentication(maxWaitTime);
  isUserAuthenticated: AuthGateway['isUserAuthenticated'] = () =>
    authApi.isUserAuthenticated();
  signUp: AuthGateway['signUp'] = (email, password) =>
    authApi.signUp(email, password);
  signIn: AuthGateway['signIn'] = (email, password) =>
    authApi.signIn(email, password);
  signOut: AuthGateway['signOut'] = () => authApi.signOut();
  onAuthStateChange: AuthGateway['onAuthStateChange'] = (callback) =>
    authApi.onAuthStateChange(callback);

  getGamblingSettings: UserSettingsGateway['getGamblingSettings'] = () =>
    userSettingsApi.getGamblingSettings(this.ctx);
  toggleGamblingMode: UserSettingsGateway['toggleGamblingMode'] = () =>
    userSettingsApi.toggleGamblingMode(this.ctx);
  isGamblingModeEnabled: UserSettingsGateway['isGamblingModeEnabled'] = () =>
    userSettingsApi.isGamblingModeEnabled(this.ctx);

  createBettingSession: BettingGateway['createBettingSession'] = (
    chainId,
    duration,
  ) => bettingApi.createBettingSession(this.ctx, chainId, duration);
  deleteBettingSession: BettingGateway['deleteBettingSession'] = (sessionId) =>
    bettingApi.deleteBettingSession(this.ctx, sessionId);
  completeTaskWithBetting: BettingGateway['completeTaskWithBetting'] = (
    sessionId,
    wasSuccessful,
    completionNotes,
  ) =>
    bettingApi.completeTaskWithBetting(
      this.ctx,
      sessionId,
      wasSuccessful,
      completionNotes,
    );
  placeBet: BettingGateway['placeBet'] = (betRequest) =>
    bettingApi.placeBet(this.ctx, betRequest);
  getUserAvailablePoints: BettingGateway['getUserAvailablePoints'] = () =>
    bettingApi.getUserAvailablePoints(this.ctx);
  getTodayBetAmount: BettingGateway['getTodayBetAmount'] = () =>
    bettingApi.getTodayBetAmount(this.ctx);

  performDailyCheckin: CheckinGateway['performDailyCheckin'] = () =>
    checkinApi.performDailyCheckin(this.ctx);
  getUserCheckinStats: CheckinGateway['getUserCheckinStats'] = () =>
    checkinApi.getUserCheckinStats(this.ctx);

  async getPetState() {
    return localStorageUtils.getPetState();
  }
  async savePetState(...args: Parameters<PetStore['savePetState']>) {
    localStorageUtils.savePetState(...args);
  }
}
