import { describe, expect, it } from 'vitest';
import { getNewYorkCheckinDate } from '../checkinSchedule';

describe('getNewYorkCheckinDate', () => {
  it('keeps the previous business date until 08:00 in New York', () => {
    expect(getNewYorkCheckinDate(new Date('2026-08-26T11:59:00Z'))).toBe(
      '2026-08-25',
    );
    expect(getNewYorkCheckinDate(new Date('2026-08-26T12:00:00Z'))).toBe(
      '2026-08-26',
    );
  });

  it('preserves the 08:00 boundary through New York daylight-saving changes', () => {
    expect(getNewYorkCheckinDate(new Date('2026-01-15T12:59:00Z'))).toBe(
      '2026-01-14',
    );
    expect(getNewYorkCheckinDate(new Date('2026-01-15T13:00:00Z'))).toBe(
      '2026-01-15',
    );
  });
});
