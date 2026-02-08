import { createContext } from 'react';
import type { MomentumStorage } from './MomentumStorage';

export const StorageContext = createContext<MomentumStorage | null>(null);
