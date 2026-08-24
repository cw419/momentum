import type {
  AuthGateway,
  BettingGateway,
  ChainStore,
  CheckinGateway,
  DailyPlanStore,
  HistoryStore,
  MaintenanceStore,
  PetStore,
  RsipStore,
  SessionStore,
  StorageCapabilities,
  TaskTimeStatsStore,
  UserSettingsGateway,
} from './ports';

export interface MomentumStorage
  extends
    ChainStore,
    SessionStore,
    HistoryStore,
    RsipStore,
    TaskTimeStatsStore,
    MaintenanceStore,
    AuthGateway,
    UserSettingsGateway,
    BettingGateway,
    CheckinGateway,
    DailyPlanStore,
    PetStore {
  readonly kind: 'local' | 'supabase';
  readonly capabilities?: StorageCapabilities;
}
