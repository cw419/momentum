import { describe, expect, it } from 'vitest';
import {
  getTrimmedNonEmptyString,
  isRecord,
  parseDateOrUndefined,
  parseTruthyDateOrNow,
  parseTruthyDateOrUndefined,
  pickNonNullish,
  sanitizeBool,
  sanitizeInt,
  sanitizeIsoDate,
  sanitizeString,
  sanitizeStringArray,
  toBooleanWithDefault,
  toNumber,
  toOptionalBoolean,
  toOptionalNumber,
  toOptionalString,
  toOptionalStringFromTruthy,
  toOptionalTruthyBoolean,
  toStringArray,
  toStringWithDefault,
} from '../primitives';

describe('serialization/primitives', () => {
  it('recognizes records and rejects primitives', () => {
    expect(isRecord({ ok: true })).toBe(true);
    expect(isRecord(null)).toBe(false);
    expect(isRecord('x')).toBe(false);
  });

  it('normalizes scalar and array values', () => {
    expect(toNumber('12', 0)).toBe(12);
    expect(toNumber('bad', 7)).toBe(7);
    expect(toOptionalNumber('15')).toBe(15);
    expect(toOptionalNumber('bad')).toBeUndefined();
    expect(toStringArray(['a', 2, null])).toEqual(['a', '2', 'null']);
    expect(toStringWithDefault(undefined, 'fallback')).toBe('fallback');
    expect(toOptionalString('value')).toBe('value');
    expect(toOptionalString(12)).toBeUndefined();
    expect(toOptionalStringFromTruthy('value')).toBe('value');
    expect(toOptionalStringFromTruthy('')).toBeUndefined();
    expect(toBooleanWithDefault(undefined, true)).toBe(true);
    expect(toBooleanWithDefault(0, true)).toBe(false);
    expect(toOptionalBoolean(false)).toBe(false);
    expect(toOptionalBoolean(undefined)).toBeUndefined();
    expect(toOptionalTruthyBoolean(true)).toBe(true);
    expect(toOptionalTruthyBoolean(0)).toBeUndefined();
  });

  it('picks candidate values and trims strings', () => {
    expect(
      pickNonNullish(
        { primary: null, secondary: 'value' },
        'primary',
        'secondary',
      ),
    ).toBe('value');
    expect(getTrimmedNonEmptyString('  abc  ')).toBe('abc');
    expect(getTrimmedNonEmptyString('   ')).toBeUndefined();
  });

  it('parses optional dates and falls back to now for truthy invalid values', () => {
    expect(parseDateOrUndefined('2026-03-08T00:00:00.000Z')).toBeInstanceOf(
      Date,
    );
    expect(parseDateOrUndefined('bad')).toBeUndefined();
    expect(
      parseTruthyDateOrUndefined('2026-03-08T00:00:00.000Z'),
    ).toBeInstanceOf(Date);
    expect(parseTruthyDateOrUndefined(0)).toBeUndefined();
    expect(parseTruthyDateOrNow('bad')).toBeInstanceOf(Date);
  });

  it('sanitizes outbound persistence values', () => {
    expect(sanitizeString(42)).toBe('42');
    expect(sanitizeString(undefined, 'fallback')).toBe('fallback');
    expect(sanitizeInt('10.9', 0)).toBe(10);
    expect(sanitizeInt('bad', 3)).toBe(3);
    expect(sanitizeBool(undefined, true)).toBe(true);
    expect(sanitizeBool(false, true)).toBe(false);
    expect(sanitizeStringArray(['a', 2, null])).toEqual(['a']);
    expect(sanitizeIsoDate(new Date('2026-03-08T00:00:00.000Z'))).toBe(
      '2026-03-08T00:00:00.000Z',
    );
    expect(sanitizeIsoDate('bad')).toBeNull();
  });
});
