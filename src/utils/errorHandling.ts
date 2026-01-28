function stringifyUnknown(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return String(value);
  if (value === null || value === undefined) return String(value);

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function toError(value: unknown, fallbackMessage: string = 'Unknown error'): Error {
  if (value instanceof Error) return value;

  const message = stringifyUnknown(value).trim();
  return new Error(message || fallbackMessage);
}
