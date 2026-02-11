import type { AppError } from '../../../domain/errors';
import { toAppError } from '../../../domain/errors';
import type { Result } from '../../../domain/result';
import { err, ok } from '../../../domain/result';
import type {
  GamblingSettings,
  UpdateSettingsResult,
} from '../../../domain/userSettings';
import type { SupabaseStorageContext } from './types';

export async function getGamblingSettings(
  ctx: SupabaseStorageContext,
): Promise<Result<GamblingSettings, AppError>> {
  try {
    const user = await ctx.getCurrentUser();
    if (!user)
      return err({
        code: 'NOT_AUTHENTICATED',
        message: 'User not authenticated',
      });

    const client = ctx.getClient();
    const { data, error } = await client
      .from('user_settings')
      .select('gambling_mode_enabled, daily_bet_limit, max_single_bet')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST116') {
        return ok({
          gambling_mode_enabled: false,
          daily_bet_limit: null,
          max_single_bet: null,
        });
      }
      return err({
        code: 'STORAGE',
        message: error.message || 'Failed to load settings',
        cause: error,
      });
    }

    return ok({
      gambling_mode_enabled: data?.gambling_mode_enabled ?? false,
      daily_bet_limit: data?.daily_bet_limit ?? null,
      max_single_bet: data?.max_single_bet ?? null,
    });
  } catch (e) {
    return err(toAppError(e, 'Failed to load gambling settings'));
  }
}

export async function isGamblingModeEnabled(
  ctx: SupabaseStorageContext,
): Promise<Result<boolean, AppError>> {
  const settings = await getGamblingSettings(ctx);
  if (!settings.ok) return settings;
  return ok(!!settings.value.gambling_mode_enabled);
}

export async function toggleGamblingMode(
  ctx: SupabaseStorageContext,
): Promise<Result<UpdateSettingsResult, AppError>> {
  try {
    const user = await ctx.getCurrentUser();
    if (!user)
      return err({
        code: 'NOT_AUTHENTICATED',
        message: 'User not authenticated',
      });

    const current = await getGamblingSettings(ctx);
    if (!current.ok) return current;

    const nextEnabled = !current.value.gambling_mode_enabled;
    const client = ctx.getClient();

    const { error } = await client
      .from('user_settings')
      .upsert({
        user_id: user.id,
        gambling_mode_enabled: nextEnabled,
        daily_bet_limit: current.value.daily_bet_limit ?? null,
        max_single_bet: current.value.max_single_bet ?? null,
      })
      .select()
      .single();

    if (error) {
      return ok({
        success: false,
        message: error.message || 'Failed to update settings',
      });
    }

    return ok({
      success: true,
      message: nextEnabled
        ? 'Gambling mode enabled successfully'
        : 'Gambling mode disabled successfully',
    });
  } catch (e) {
    return err(toAppError(e, 'Failed to toggle gambling mode'));
  }
}
