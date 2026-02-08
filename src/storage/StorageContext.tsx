import React, { useEffect, useMemo, useState } from 'react';
import type { MomentumStorage } from './MomentumStorage';
import { localStorageAdapter } from './localStorageAdapter';
import { StorageContext } from './storageContextValue';
import { isSupabaseConfigured } from '../utils/supabaseConfig';
import { realTimeSyncService } from '../services/RealTimeSyncService';
import { RecycleBinService } from '../services/RecycleBinService';
import { exceptionRuleMigration } from '../services/ExceptionRuleMigration';
import { logger } from '../utils/logger';
import { useI18n } from '../i18n';
import { normalizeUnknownError } from '../utils/errors/normalizeError';

interface StorageProviderProps {
  storage?: MomentumStorage;
  children: React.ReactNode;
}

export function StorageProvider({ storage, children }: StorageProviderProps) {
  const { tr } = useI18n();
  const [dynamicStorage, setDynamicStorage] = useState<MomentumStorage | null>(
    storage ?? (isSupabaseConfigured ? null : localStorageAdapter),
  );

  useEffect(() => {
    if (
      storage ||
      !isSupabaseConfigured ||
      dynamicStorage?.kind === 'supabase'
    ) {
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
        logger.error(
          'STORAGE',
          'Failed to load Supabase storage, falling back to localStorage',
          undefined,
          normalizeUnknownError(error),
        );
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
    exceptionRuleMigration.setStorage(resolvedStorage);
    return () => {
      realTimeSyncService.setStorage(null);
      RecycleBinService.setStorage(null);
      exceptionRuleMigration.setStorage(null);
    };
  }, [resolvedStorage]);

  if (!resolvedStorage) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="gradient-primary mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
          </div>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            {tr('初始化存储…', 'Initializing storage…')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <StorageContext.Provider value={resolvedStorage}>
      {children}
    </StorageContext.Provider>
  );
}
