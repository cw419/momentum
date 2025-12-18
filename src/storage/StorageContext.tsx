import React, { createContext, useContext, useMemo } from 'react';
import type { MomentumStorage } from './MomentumStorage';
import { localStorageAdapter } from './localStorageAdapter';
import { supabaseStorage } from '../utils/supabaseStorage';
import { isSupabaseConfigured } from '../lib/supabase';

const StorageContext = createContext<MomentumStorage | null>(null);

interface StorageProviderProps {
  storage?: MomentumStorage;
  children: React.ReactNode;
}

export function StorageProvider({ storage, children }: StorageProviderProps) {
  const resolvedStorage = useMemo<MomentumStorage>(() => {
    if (storage) return storage;
    return isSupabaseConfigured ? supabaseStorage : localStorageAdapter;
  }, [storage]);

  return <StorageContext.Provider value={resolvedStorage}>{children}</StorageContext.Provider>;
}

export function useStorage(): MomentumStorage {
  const storage = useContext(StorageContext);
  if (!storage) {
    throw new Error('useStorage must be used within a StorageProvider');
  }
  return storage;
}
