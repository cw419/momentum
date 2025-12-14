export interface AuthUser {
  id: string;
  email?: string | null;
  createdAt?: string;
  lastSignInAt?: string | null;
  userMetadata?: Record<string, unknown> | null;
}

export interface AuthenticationResult {
  user: AuthUser | null;
  isAuthenticated: boolean;
}

export type AuthStateChangeEvent =
  | 'INITIAL_SESSION'
  | 'SIGNED_IN'
  | 'SIGNED_OUT'
  | 'TOKEN_REFRESHED'
  | 'USER_UPDATED'
  | 'PASSWORD_RECOVERY'
  | string;

export interface AuthSession {
  user: AuthUser | null;
}

