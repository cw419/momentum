import type { supabase } from '../../../lib/supabase';

export interface SchemaVerificationResult {
  hasAllColumns: boolean;
  missingColumns: string[];
  error?: string;
}

export type SupabaseClient = NonNullable<typeof supabase>;

export interface SupabaseStorageContext {
  getClient(): SupabaseClient;
  getCurrentUser(): Promise<any | null>;
  waitForAuthentication(maxWaitTime?: number): Promise<{ user: any | null; isAuthenticated: boolean }>;
  isUserAuthenticated(): Promise<boolean>;

  retryOperation<T>(operation: () => Promise<T>, maxRetries?: number, baseDelay?: number): Promise<T>;
  retryWithAuth<T>(operation: () => Promise<T>, maxRetries?: number, baseDelay?: number): Promise<T>;

  verifySchemaColumns(tableName: string, requiredColumns: string[]): Promise<SchemaVerificationResult>;
  clearSchemaCache(): void;
}

