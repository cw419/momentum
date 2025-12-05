import { supabase, isSupabaseConfigured, getCurrentUser } from '../lib/supabase';

export type WriteSessionType = 'betting' | 'import' | 'maintenance';

export interface WriteSessionResult {
  success: boolean;
  session_token?: string;
  session_type?: WriteSessionType;
  expires_at?: string;
  allowed_operations?: string[];
  max_operations?: number;
  duration_minutes?: number;
  error?: string;
}

export interface WriteSessionStatus {
  success: boolean;
  session_token?: string;
  session_type?: WriteSessionType;
  status?: 'active' | 'completed' | 'expired';
  started_at?: string;
  expires_at?: string;
  is_expired?: boolean;
  operation_count?: number;
  max_operations?: number;
  allowed_operations?: string[];
  error?: string;
}

export class WriteSessionService {
  private static ensureSupabaseConfigured(): void {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase not configured');
    }
  }

  static async createSession(
    sessionType: WriteSessionType = 'betting',
    durationMinutes?: number
  ): Promise<WriteSessionResult> {
    try {
      this.ensureSupabaseConfigured();

      const user = await getCurrentUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { data, error } = await supabase!.rpc('create_write_session', {
        session_type: sessionType,
        duration_minutes: durationMinutes ?? null
      });

      if (error) {
        console.error('[WriteSessionService] Failed to create session:', error);
        return { success: false, error: error.message };
      }

      if (!data?.success) {
        return { success: false, error: data?.error || 'Unknown error' };
      }

      return {
        success: true,
        session_token: data.session_token,
        session_type: data.session_type,
        expires_at: data.expires_at,
        allowed_operations: data.allowed_operations,
        max_operations: data.max_operations,
        duration_minutes: data.duration_minutes
      };
    } catch (error) {
      console.error('[WriteSessionService] Error creating session:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  static async createBettingSession(): Promise<WriteSessionResult> {
    return this.createSession('betting', 5);
  }

  static async getSessionStatus(sessionToken: string): Promise<WriteSessionStatus> {
    try {
      this.ensureSupabaseConfigured();

      const { data, error } = await supabase!.rpc('get_write_session_status', {
        p_session_token: sessionToken
      });

      if (error) {
        console.error('[WriteSessionService] Failed to get status:', error);
        return { success: false, error: error.message };
      }

      return data as WriteSessionStatus;
    } catch (error) {
      console.error('[WriteSessionService] Error getting status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  static async completeSession(sessionToken: string): Promise<{ success: boolean; error?: string }> {
    try {
      this.ensureSupabaseConfigured();

      const { data, error } = await supabase!.rpc('complete_write_session', {
        p_session_token: sessionToken
      });

      if (error) {
        console.error('[WriteSessionService] Failed to complete session:', error);
        return { success: false, error: error.message };
      }

      return { success: data?.success ?? false, error: data?.error };
    } catch (error) {
      console.error('[WriteSessionService] Error completing session:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export default WriteSessionService;
