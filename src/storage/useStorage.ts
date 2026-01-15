import { useContext } from 'react';
import type { MomentumStorage } from './MomentumStorage';
import { StorageContext } from './storageContextValue';

export function useStorage(): MomentumStorage {
  const storage = useContext(StorageContext);
  if (!storage) {
    throw new Error('useStorage must be used within a StorageProvider');
  }
  return storage;
}
