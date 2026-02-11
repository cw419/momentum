import type { supabase } from '../../../lib/supabase';
import type { User } from '@supabase/supabase-js';

export interface SchemaVerificationResult {
  hasAllColumns: boolean;
  missingColumns: string[];
  error?: string;
}

export type SchemaCapabilityState = 'missing' | 'available';

export type SupabaseClient = NonNullable<typeof supabase>;

export interface SupabaseStorageContext {
  getClient(): SupabaseClient;
  getCurrentUser(): Promise<User | null>;
  waitForAuthentication(
    maxWaitTime?: number,
  ): Promise<{ user: User | null; isAuthenticated: boolean }>;
  isUserAuthenticated(): Promise<boolean>;

  retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries?: number,
    baseDelay?: number,
  ): Promise<T>;
  retryWithAuth<T>(
    operation: () => Promise<T>,
    maxRetries?: number,
    baseDelay?: number,
  ): Promise<T>;

  verifySchemaColumns(
    tableName: string,
    requiredColumns: string[],
  ): Promise<SchemaVerificationResult>;
  isSchemaCapabilityMissing(
    tableName: string,
    capabilityName: string,
  ): boolean;
  markSchemaCapabilityMissing(tableName: string, capabilityName: string): void;
  markSchemaCapabilityAvailable(
    tableName: string,
    capabilityName: string,
  ): void;
  clearSchemaCache(): void;
}
