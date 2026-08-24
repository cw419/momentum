import type {
  Chain,
  CompletionHistory,
  ExceptionRule,
  RSIPExecutionRecord,
  RSIPLibraryEntry,
  RSIPMeta,
  RSIPNode,
  RSIPNodeGroup,
  RSIPRunRecord,
  RSIPTaskLink,
  ScheduledSession,
  DailyPlan,
} from '../../types';
import type { PetState } from '../../types/pet';

interface DashboardImportOptions {
  history?: CompletionHistory[];
  rsipNodes?: RSIPNode[];
  rsipMeta?: RSIPMeta;
  rsipGroups?: RSIPNodeGroup[];
  rsipPolicyLibrary?: RSIPLibraryEntry[];
  rsipRunHistory?: RSIPRunRecord[];
  rsipExecutionRecords?: RSIPExecutionRecord[];
  rsipTaskLinks?: RSIPTaskLink[];
  petState?: PetState;
  exceptionRules?: ExceptionRule[];
}

export interface DashboardProps {
  chains: Chain[];
  chainsRevision: number;
  dailyPlans: DailyPlan[];
  scheduledSessions: ScheduledSession[];
  isLoading?: boolean;
  onCreateChain: () => void;
  onCreateChainForToday: () => void;
  onCreateTaskGroup?: () => void;
  onOpenRSIP?: () => void;
  onStartChain: (chainId: string) => void;
  onAddPlanUnits: (chainId: string, count: number) => Promise<void>;
  onRemovePlanUnits: (chainId: string, count: number) => Promise<void>;
  onStartPlanItem: (chainId: string, itemId: string) => Promise<void>;
  onScheduleChain: (chainId: string) => void;
  onViewChainDetail: (chainId: string) => void;
  onCancelScheduledSession?: (chainId: string) => void;
  onCompleteBooking?: (chainId: string) => void;
  onDeleteChain: (chainId: string) => void;
  onImportChains: (
    chains: Chain[],
    options?: DashboardImportOptions,
  ) => Promise<void>;
  onRestoreChains?: (chainIds: string[]) => void | Promise<void>;
  onPermanentDeleteChains?: (chainIds: string[]) => void | Promise<void>;
  history?: CompletionHistory[];
  rsipNodes?: RSIPNode[];
  rsipMeta?: RSIPMeta;
  rsipGroups?: RSIPNodeGroup[];
  rsipPolicyLibrary?: RSIPLibraryEntry[];
  rsipRunHistory?: RSIPRunRecord[];
  rsipExecutionRecords?: RSIPExecutionRecord[];
  rsipTaskLinks?: RSIPTaskLink[];
  petState?: PetState | null;
  userPreferences?: unknown;
}
