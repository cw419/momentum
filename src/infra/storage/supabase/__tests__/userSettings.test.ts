import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getGamblingSettings,
  isGamblingModeEnabled,
  toggleGamblingMode,
} from '../userSettings';
import {
  createMockContext,
  createSupabaseError,
} from '../testHelpers';

vi.mock('../../../../utils/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    dbOperation: vi.fn(),
  },
}));

describe('userSettings.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getGamblingSettings', () => {
    it('should return error when user is not authenticated', async () => {
      const ctx = createMockContext({ user: null });

      const result = await getGamblingSettings(ctx);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('NOT_AUTHENTICATED');
      }
    });

    it('should return default settings when no record exists', async () => {
      const ctx = createMockContext();
      ctx.mockClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockReturnValue({
              data: null,
              error: createSupabaseError('PGRST116', 'No rows returned'),
            }),
          }),
        }),
      });

      const result = await getGamblingSettings(ctx);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.gambling_mode_enabled).toBe(false);
        expect(result.value.daily_bet_limit).toBeNull();
        expect(result.value.max_single_bet).toBeNull();
      }
    });

    it('should return settings on success', async () => {
      const mockSettings = {
        gambling_mode_enabled: true,
        daily_bet_limit: 1000,
        max_single_bet: 200,
      };
      const ctx = createMockContext();
      ctx.mockClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockReturnValue({
              data: mockSettings,
              error: null,
            }),
          }),
        }),
      });

      const result = await getGamblingSettings(ctx);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.gambling_mode_enabled).toBe(true);
        expect(result.value.daily_bet_limit).toBe(1000);
        expect(result.value.max_single_bet).toBe(200);
      }
    });

    it('should return error on other database errors', async () => {
      const ctx = createMockContext();
      ctx.mockClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockReturnValue({
              data: null,
              error: createSupabaseError('UNKNOWN', 'Database error'),
            }),
          }),
        }),
      });

      const result = await getGamblingSettings(ctx);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('STORAGE');
      }
    });

    it('should handle null values in settings', async () => {
      const mockSettings = {
        gambling_mode_enabled: null,
        daily_bet_limit: null,
        max_single_bet: null,
      };
      const ctx = createMockContext();
      ctx.mockClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockReturnValue({
              data: mockSettings,
              error: null,
            }),
          }),
        }),
      });

      const result = await getGamblingSettings(ctx);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.gambling_mode_enabled).toBe(false);
        expect(result.value.daily_bet_limit).toBeNull();
        expect(result.value.max_single_bet).toBeNull();
      }
    });

    it('should handle exceptions gracefully', async () => {
      const ctx = createMockContext();
      ctx.mockClient.from = vi.fn().mockImplementation(() => {
        throw new Error('Network error');
      });

      const result = await getGamblingSettings(ctx);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('UNKNOWN');
      }
    });
  });

  describe('isGamblingModeEnabled', () => {
    it('should return error when user is not authenticated', async () => {
      const ctx = createMockContext({ user: null });

      const result = await isGamblingModeEnabled(ctx);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('NOT_AUTHENTICATED');
      }
    });

    it('should return true when gambling mode is enabled', async () => {
      const ctx = createMockContext();
      ctx.mockClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockReturnValue({
              data: {
                gambling_mode_enabled: true,
                daily_bet_limit: 1000,
                max_single_bet: 200,
              },
              error: null,
            }),
          }),
        }),
      });

      const result = await isGamblingModeEnabled(ctx);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(true);
      }
    });

    it('should return false when gambling mode is disabled', async () => {
      const ctx = createMockContext();
      ctx.mockClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockReturnValue({
              data: {
                gambling_mode_enabled: false,
                daily_bet_limit: null,
                max_single_bet: null,
              },
              error: null,
            }),
          }),
        }),
      });

      const result = await isGamblingModeEnabled(ctx);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(false);
      }
    });

    it('should return false when no settings exist', async () => {
      const ctx = createMockContext();
      ctx.mockClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockReturnValue({
              data: null,
              error: createSupabaseError('PGRST116', 'No rows returned'),
            }),
          }),
        }),
      });

      const result = await isGamblingModeEnabled(ctx);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(false);
      }
    });
  });

  describe('toggleGamblingMode', () => {
    it('should return error when user is not authenticated', async () => {
      const ctx = createMockContext({ user: null });

      const result = await toggleGamblingMode(ctx);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('NOT_AUTHENTICATED');
      }
    });

    it('should enable gambling mode when currently disabled', async () => {
      const ctx = createMockContext();
      let upsertCalled = false;
      let upsertData: Record<string, unknown> = {};

      ctx.mockClient.from = vi.fn().mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockReturnValue({
              data: {
                gambling_mode_enabled: false,
                daily_bet_limit: null,
                max_single_bet: null,
              },
              error: null,
            }),
          }),
        }),
        upsert: vi.fn().mockImplementation((data: Record<string, unknown>) => {
          upsertCalled = true;
          upsertData = data;
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockReturnValue({
                data: { ...data, gambling_mode_enabled: true },
                error: null,
              }),
            }),
          };
        }),
      }));

      const result = await toggleGamblingMode(ctx);

      expect(result.ok).toBe(true);
      expect(upsertCalled).toBe(true);
      expect(upsertData.gambling_mode_enabled).toBe(true);
      if (result.ok) {
        expect(result.value.success).toBe(true);
        expect(result.value.message).toContain('enabled');
      }
    });

    it('should disable gambling mode when currently enabled', async () => {
      const ctx = createMockContext();
      let upsertData: Record<string, unknown> = {};

      ctx.mockClient.from = vi.fn().mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockReturnValue({
              data: {
                gambling_mode_enabled: true,
                daily_bet_limit: 1000,
                max_single_bet: 200,
              },
              error: null,
            }),
          }),
        }),
        upsert: vi.fn().mockImplementation((data: Record<string, unknown>) => {
          upsertData = data;
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockReturnValue({
                data: { ...data, gambling_mode_enabled: false },
                error: null,
              }),
            }),
          };
        }),
      }));

      const result = await toggleGamblingMode(ctx);

      expect(result.ok).toBe(true);
      expect(upsertData.gambling_mode_enabled).toBe(false);
      expect(upsertData.daily_bet_limit).toBe(1000);
      expect(upsertData.max_single_bet).toBe(200);
      if (result.ok) {
        expect(result.value.success).toBe(true);
        expect(result.value.message).toContain('disabled');
      }
    });

    it('should return failure result when upsert fails', async () => {
      const ctx = createMockContext();
      ctx.mockClient.from = vi.fn().mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockReturnValue({
              data: {
                gambling_mode_enabled: false,
                daily_bet_limit: null,
                max_single_bet: null,
              },
              error: null,
            }),
          }),
        }),
        upsert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockReturnValue({
              data: null,
              error: createSupabaseError('UNKNOWN', 'Upsert failed'),
            }),
          }),
        }),
      }));

      const result = await toggleGamblingMode(ctx);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.success).toBe(false);
        expect(result.value.message).toContain('Upsert failed');
      }
    });

    it('should propagate error when getting current settings fails', async () => {
      const ctx = createMockContext();
      ctx.mockClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockReturnValue({
              data: null,
              error: createSupabaseError('UNKNOWN', 'Database error'),
            }),
          }),
        }),
      });

      const result = await toggleGamblingMode(ctx);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('STORAGE');
      }
    });

    it('should handle exceptions gracefully', async () => {
      const ctx = createMockContext();
      ctx.mockClient.from = vi.fn().mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockReturnValue({
              data: {
                gambling_mode_enabled: false,
                daily_bet_limit: null,
                max_single_bet: null,
              },
              error: null,
            }),
          }),
        }),
        upsert: vi.fn().mockImplementation(() => {
          throw new Error('Network error');
        }),
      }));

      const result = await toggleGamblingMode(ctx);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('UNKNOWN');
      }
    });
  });
});
