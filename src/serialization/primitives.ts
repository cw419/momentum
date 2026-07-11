export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function toNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function toOptionalNumber(value: unknown): number | undefined {
  if (value == null) return undefined;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item)).filter((item) => item.length > 0);
}

export function sanitizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

export function toStringWithDefault(value: unknown, fallback: string): string {
  if (value == null) return fallback;
  return String(value);
}

export function sanitizeString(value: unknown, fallback: string = ''): string {
  if (typeof value === 'string') return value;
  if (value == null) return fallback;
  return String(value);
}

export function toOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export function toOptionalStringFromTruthy(value: unknown): string | undefined {
  if (!value) return undefined;
  return String(value);
}

export function getTrimmedNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function toBooleanWithDefault(
  value: unknown,
  fallback: boolean,
): boolean {
  if (value == null) return fallback;
  return Boolean(value);
}

export function sanitizeBool(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  return fallback;
}

export function toOptionalBoolean(value: unknown): boolean | undefined {
  return value != null ? Boolean(value) : undefined;
}

export function toOptionalTruthyBoolean(value: unknown): true | undefined {
  if (!value) return undefined;
  return true;
}

export function sanitizeInt(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.trunc(parsed);
}

export function pickNonNullish(
  raw: Record<string, unknown>,
  primaryKey: string,
  secondaryKey: string,
): unknown {
  const primaryValue = raw[primaryKey];
  if (primaryValue != null) return primaryValue;

  const secondaryValue = raw[secondaryKey];
  if (secondaryValue != null) return secondaryValue;

  return undefined;
}

export function parseDateOrUndefined(value: unknown): Date | undefined {
  if (value == null) return undefined;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value;
  }

  if (typeof value !== 'string') return undefined;

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export function parseTruthyDateOrUndefined(value: unknown): Date | undefined {
  if (!value) return undefined;
  return parseDateOrUndefined(value);
}

export function parseTruthyDateOrNow(value: unknown): Date {
  return parseTruthyDateOrUndefined(value) ?? new Date();
}

export function toIsoString(date: Date): string {
  return date.toISOString();
}

export function sanitizeIsoDate(value: unknown): string | null {
  if (value == null) return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }

  return null;
}
