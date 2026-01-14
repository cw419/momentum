type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

function getStringField(obj: UnknownRecord, key: string): string | undefined {
  const value = obj[key];
  return typeof value === 'string' && value.trim() ? value : undefined;
}

export function getSupabaseErrorCode(error: unknown): string | undefined {
  if (!isRecord(error)) return undefined;
  return getStringField(error, 'code');
}

export function getSupabaseErrorMessage(error: unknown, fallback: string): string {
  if (!isRecord(error)) return fallback;
  return getStringField(error, 'message') ?? fallback;
}

export function formatSupabaseError(error: unknown, fallback: string): string {
  if (!isRecord(error)) return fallback;

  const code = getStringField(error, 'code');
  const message = getStringField(error, 'message') ?? fallback;
  const details = getStringField(error, 'details');
  const hint = getStringField(error, 'hint');

  const parts: string[] = [];
  if (code) parts.push(`code=${code}`);
  if (message) parts.push(message);
  if (details) parts.push(`details=${details}`);
  if (hint) parts.push(`hint=${hint}`);

  return parts.length > 0 ? parts.join(' | ') : fallback;
}

