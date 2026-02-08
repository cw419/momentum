export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function toNumber(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function toOptionalNumber(value: unknown): number | undefined {
  if (value == null) return undefined;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v)).filter((v) => v.length > 0);
}

export function toStringWithDefault(value: unknown, fallback: string): string {
  if (value == null) return fallback;
  return String(value);
}

export function toOptionalStringFromTruthy(value: unknown): string | undefined {
  if (!value) return undefined;
  return String(value);
}

export function toBooleanWithDefault(
  value: unknown,
  fallback: boolean,
): boolean {
  if (value == null) return fallback;
  return Boolean(value);
}

export function toOptionalTruthyBoolean(value: unknown): true | undefined {
  if (!value) return undefined;
  return true;
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

export function getTrimmedNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function toOptionalBoolean(value: unknown): boolean | undefined {
  return value != null ? Boolean(value) : undefined;
}

export function toOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export function parseTruthyDateOrNow(value: unknown): Date {
  return value ? new Date(String(value)) : new Date();
}
