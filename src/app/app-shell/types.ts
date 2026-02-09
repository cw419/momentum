import type {
  AppState,
  Chain,
  ChainDraft,
  CompletionHistory,
  ExceptionRule,
  RSIPLibraryEntry,
  RSIPMeta,
  RSIPNode,
  RSIPNodeGroup,
  RSIPRunRecord,
  RSIPTaskLink,
} from '../../types';
import type { BetPlacementResult } from '../../domain/betting';
import type {
  FeedResult,
  PetMood,
  PetState,
  TaskCompletionReward,
} from '../../types/pet';

interface ImportChainsOptions {
  history?: CompletionHistory[];
  rsipNodes?: RSIPNode[];
  rsipMeta?: RSIPMeta;
  exceptionRules?: ExceptionRule[];
}

interface RSIPExecutionActionOptions {
  reinforce?: boolean;
  reasonCode?: string;
  repairHint?: string;
  sourceChainId?: string;
  sourceEvent?: string;
}

interface RSIPViolationActionOptions {
  reasonCode?: string;
  repairHint?: string;
  sourceChainId?: string;
  sourceEvent?: string;
  collapseReason?: string;
}

export interface AppShellViewProps {
  state: AppState;
  isInitialized: boolean;
  isLoadingData: boolean;

  showAuxiliaryJudgment: string | null;
  setShowAuxiliaryJudgment: (chainId: string | null) => void;

  showBettingModal: boolean;
  pendingChainId: string | null;
  currentSessionId: string | null;

  handleCreateChain: (parentId?: string | null) => void;
  handleCreateTaskGroup: () => void;
  handleEditChain: (chainId: string) => void;
  handleSaveChain: (chainData: ChainDraft, isCopy?: boolean) => void;

  handleViewChainDetail: (chainId: string) => void;
  handleBackToDashboard: () => void;

  openRSIP: () => void;
  saveRSIPNodes: (nodes: RSIPNode[]) => void;
  saveRSIPMeta: (meta: RSIPMeta) => void;
  saveRSIPGroups: (groups: RSIPNodeGroup[]) => void;
  saveRSIPPolicyLibrary: (entries: RSIPLibraryEntry[]) => void;
  saveRSIPRunHistory: (records: RSIPRunRecord[]) => void;
  saveRSIPTaskLinks: (links: RSIPTaskLink[]) => void;
  markRSIPExecuted: (
    nodeId: string,
    nodes: RSIPNode[],
    notes?: string,
    options?: RSIPExecutionActionOptions,
  ) => Promise<RSIPNode[]>;
  markRSIPViolated: (
    nodeId: string,
    nodes: RSIPNode[],
    notes?: string,
    options?: RSIPViolationActionOptions,
  ) => Promise<RSIPNode[]>;
  reinforceRSIPNode: (
    nodeId: string,
    nodes: RSIPNode[],
    levelDelta?: number,
  ) => Promise<RSIPNode[]>;
  restoreRSIPFromLibrary: (
    entryId: string,
    parentId?: string,
  ) => Promise<RSIPNode | null>;
  createRSIPGroup: (
    title: string,
    faultTolerance: number,
    emoji?: string,
  ) => Promise<RSIPNodeGroup>;
  upsertRSIPTaskLinks: (links: RSIPTaskLink[]) => Promise<RSIPTaskLink[]>;
  getRSIPTaskActions: (rsipNodeId: string) => RSIPTaskLink[];

  handleScheduleChain: (chainId: string) => void;
  handleStartChain: (chainId: string) => Promise<void>;
  handleCancelScheduledSession: (chainId: string) => void;
  handleCompleteBooking: (chainId: string) => void;

  handleCompleteSession: (description?: string, notes?: string) => void;
  handleInterruptSession: (reason?: string) => void;
  handlePauseSession: () => void;
  handleResumeSession: () => void;

  handleDeleteChain: (chainId: string) => Promise<void>;
  handleRestoreChains: (chainIds: string[]) => Promise<void>;
  handlePermanentDeleteChains: (chainIds: string[]) => Promise<void>;

  handleAuxiliaryJudgmentFailure: (chainId: string) => void;
  handleAuxiliaryJudgmentAllow: (
    chainId: string,
    exceptionRule: string,
  ) => void;

  handleImportChains: (
    importedChains: Chain[],
    options?: ImportChainsOptions,
  ) => Promise<void>;
  handleImportUnits: (
    unitIds: string[],
    groupId: string,
    mode?: 'move' | 'copy',
  ) => Promise<void>;
  handleUpdateTaskRepeatCount: (
    chainId: string,
    repeatCount: number,
  ) => Promise<void>;
  handleReorderUnit: (
    groupId: string,
    unitId: string,
    direction: 'up' | 'down',
  ) => Promise<void>;

  handleBetPlaced: (betResult: BetPlacementResult) => Promise<void>;
  handleBetCancelled: () => Promise<void>;

  petDomain: {
    pet: PetState | null;
    mood: PetMood;
    isLoading: boolean;
    hasPet: boolean;
    createPet: (name: string) => Promise<PetState>;
    feedPet: () => Promise<FeedResult | null>;
    onTaskCompleted: (
      duration: number,
      wasSuccessful: boolean,
    ) => Promise<TaskCompletionReward | null>;
    updatePosition: (x: number, y: number) => Promise<void>;
    updateMinimizedPosition: (x: number, y: number) => Promise<void>;
    toggleVisibility: () => Promise<void>;
    showPet: () => Promise<void>;
    minimize: () => Promise<void>;
    expand: () => Promise<void>;
  };
}
