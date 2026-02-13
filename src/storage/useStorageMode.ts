import { useContext } from 'react';
import {
  StorageModeContext,
  type StorageModeContextValue,
} from './storageModeContextValue';

export function useStorageMode(): StorageModeContextValue {
  const value = useContext(StorageModeContext);
  if (!value) {
    throw new Error('useStorageMode must be used within a StorageProvider');
  }
  return value;
}
