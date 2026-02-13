import { createContext } from 'react';

export type StorageMode = 'local' | 'supabase';

export interface StorageModeContextValue {
  mode: StorageMode;
  canUseSupabase: boolean;
  isChoicePending: boolean;
  setMode: (mode: StorageMode) => void;
  dismissFirstLaunchHint: () => void;
}

export const StorageModeContext = createContext<StorageModeContextValue | null>(
  null,
);
