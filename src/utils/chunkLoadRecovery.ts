import { isProd } from './env';
import { logger } from './logger';

const CHUNK_RELOAD_KEY = 'momentum:chunk-reload-at';
const CHUNK_RELOAD_COOLDOWN_MS = 60_000;

const CHUNK_ERROR_PATTERNS = [
  'chunkloaderror',
  'loading chunk',
  'failed to fetch dynamically imported module',
  'importing a module script failed',
  'dynamically imported module',
];

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface ChunkLoadRecoveryOptions {
  force?: boolean;
  now?: number;
  reload?: () => void;
  storage?: StorageLike | null;
}

function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;

  if (error && typeof error === 'object' && 'message' in error) {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === 'string') return maybeMessage;
  }

  return '';
}

function getDefaultStorage(): StorageLike | null {
  if (typeof window === 'undefined') return null;

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function getLastReloadAt(storage: StorageLike | null): number | null {
  if (!storage) return null;

  try {
    const raw = storage.getItem(CHUNK_RELOAD_KEY);
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function markReloadAt(storage: StorageLike | null, now: number): void {
  if (!storage) return;

  try {
    storage.setItem(CHUNK_RELOAD_KEY, String(now));
  } catch {
    // Ignore quota/storage errors and continue without persistence.
  }
}

export function isChunkLoadError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();
  if (!message) return false;

  return CHUNK_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
}

export function attemptChunkLoadRecovery(
  error: unknown,
  options: ChunkLoadRecoveryOptions = {},
): boolean {
  const enabled = options.force ?? isProd;
  if (!enabled || !isChunkLoadError(error)) return false;

  const now = options.now ?? Date.now();
  const storage = options.storage ?? getDefaultStorage();
  const lastReloadAt = getLastReloadAt(storage);

  if (lastReloadAt !== null && now - lastReloadAt < CHUNK_RELOAD_COOLDOWN_MS) {
    logger.warn('PWA_CHUNK', 'Chunk load recovery skipped during cooldown', {
      cooldownMs: CHUNK_RELOAD_COOLDOWN_MS,
      elapsedMs: now - lastReloadAt,
    });
    return false;
  }

  markReloadAt(storage, now);

  logger.warn('PWA_CHUNK', 'Chunk load error detected, reloading page', {
    message: getErrorMessage(error),
  });

  const reload = options.reload ?? (() => window.location.reload());
  reload();
  return true;
}

export function installChunkLoadRecovery(): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const onError = (event: ErrorEvent) => {
    if (attemptChunkLoadRecovery(event.error ?? event.message)) {
      event.preventDefault();
    }
  };

  const onUnhandledRejection = (event: PromiseRejectionEvent) => {
    if (attemptChunkLoadRecovery(event.reason)) {
      event.preventDefault();
    }
  };

  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onUnhandledRejection);

  return () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onUnhandledRejection);
  };
}
