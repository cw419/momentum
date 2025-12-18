import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import type { MomentumStorage } from './MomentumStorage';
import { localStorageAdapter } from './localStorageAdapter';
import { isSupabaseConfigured } from '../utils/supabaseConfig';
import { realTimeSyncService } from '../services/RealTimeSyncService';
import { RecycleBinService } from '../services/RecycleBinService';
import { logger } from '../utils/logger';

const StorageContext = createContext<MomentumStorage | null>(null);

interface StorageProviderProps {
  storage?: MomentumStorage;
  children: React.ReactNode;
}

export function StorageProvider({ storage, children }: StorageProviderProps) {
  const [dynamicStorage, setDynamicStorage] = useState<MomentumStorage | null>(
    storage ?? (isSupabaseConfigured ? null : localStorageAdapter)
  );

  useEffect(() => {
    if (storage || !isSupabaseConfigured || dynamicStorage?.kind === 'supabase') {
      return;
    }

    let cancelled = false;

    const loadSupabase = async () => {
      try {
        const { supabaseStorage } = await import('../utils/supabaseStorage');
        if (!cancelled) {
          logger.debug('STORAGE', 'Supabase storage loaded dynamically');
          setDynamicStorage(supabaseStorage);
        }
      } catch (error) {
        logger.error('STORAGE', 'Failed to load Supabase storage, falling back to localStorage', undefined, error as Error);
        if (!cancelled) {
          setDynamicStorage(localStorageAdapter);
        }
      }
    };

    loadSupabase();

    return () => {
      cancelled = true;
    };
  }, [storage, dynamicStorage?.kind]);

  const resolvedStorage = useMemo<MomentumStorage | null>(() => {
    if (storage) return storage;
    return dynamicStorage;
  }, [storage, dynamicStorage]);

  useEffect(() => {
    if (!resolvedStorage) return;

    realTimeSyncService.setStorage(resolvedStorage);
    RecycleBinService.setStorage(resolvedStorage);
    return () => {
      realTimeSyncService.setStorage(null);
      RecycleBinService.setStorage(null);
    };
  }, [resolvedStorage]);

  if (!resolvedStorage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4 shadow-lg">
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-500 dark:text-slate-400 text-sm">初始化存储...</p>
        </div>
      </div>
    );
  }

  return <StorageContext.Provider value={resolvedStorage}>{children}</StorageContext.Provider>;
}

export function useStorage(): MomentumStorage {
  const storage = useContext(StorageContext);
  if (!storage) {
    throw new Error('useStorage must be used within a StorageProvider');
  }
  return storage;
}
