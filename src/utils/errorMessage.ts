import type { Language } from '../i18n';

const CHINESE_CHAR_REGEX = /[\u4e00-\u9fff]/;

function containsChinese(text: string): boolean {
  return CHINESE_CHAR_REGEX.test(text);
}

function extractErrorCode(errorMessage: string): string | null {
  const message = errorMessage || '';

  const pgrst = message.match(/\bPGRST\d+\b/);
  if (pgrst) return pgrst[0];

  // Common Postgres SQLSTATE codes (5 chars, digits/letters). Keep a conservative match to reduce false positives.
  // SQLSTATE always starts with two digits (e.g. 23514, 42P01, 25006).
  const sqlstate = message.match(/\b\d{2}[0-9A-Z]{3}\b/);
  if (sqlstate) return sqlstate[0];

  return null;
}

function includesAny(message: string, fragments: readonly string[]): boolean {
  return fragments.some((fragment) => message.includes(fragment));
}

function includesAll(message: string, fragments: readonly string[]): boolean {
  return fragments.every((fragment) => message.includes(fragment));
}

function isReadOnlyModeError(lower: string): boolean {
  return (
    includesAny(lower, ['read-only', 'readonly', 'read only', '25006']) ||
    includesAll(lower, ['cannot execute', 'read', 'only'])
  );
}

function isNetworkError(lower: string): boolean {
  return (
    includesAny(lower, [
      'failed to fetch',
      'fetch failed',
      'network error',
      'timeout',
    ]) || includesAll(lower, ['connection', 'supabase'])
  );
}

function isAuthError(lower: string): boolean {
  return includesAny(lower, [
    'jwt expired',
    'invalid jwt',
    'not authenticated',
    'authentication',
    'auth',
  ]);
}

function isRlsError(lower: string): boolean {
  return includesAny(lower, [
    'row-level security',
    'rls',
    'violates row-level security policy',
  ]);
}

function isRateLimitedError(lower: string): boolean {
  return includesAny(lower, ['too many requests', '429']);
}

function isProjectPausedError(lower: string): boolean {
  return (
    lower.includes('project is paused') ||
    includesAll(lower, ['paused', 'project'])
  );
}

function translateKnownErrorsZh(lower: string): string | null {
  if (isReadOnlyModeError(lower)) {
    return '数据库处于只读模式，写入被拒绝（可能是 Supabase 免费额度/磁盘空间/项目状态导致）。请到 Supabase Dashboard 检查用量与项目状态。';
  }

  if (isNetworkError(lower)) {
    return '网络错误：无法连接到 Supabase，请检查网络或稍后重试。';
  }

  if (isAuthError(lower)) {
    return '登录状态异常或已过期，请重新登录后再试。';
  }

  if (isRlsError(lower)) {
    return '权限不足（RLS 拒绝）。请确认已登录，并检查 Supabase 的 RLS Policy 是否允许当前操作。';
  }

  if (lower.includes('chains_time_limit_check')) {
    return '任务群保存失败：需要设置时间限制（timeLimitHours）。可先用默认值 24 小时。';
  }

  if (lower.includes('chains_time_limit_hours_check')) {
    return '任务群保存失败：时间限制必须是正数（建议 1-168 小时）。';
  }

  if (isRateLimitedError(lower)) {
    return '请求过于频繁（429），请稍后重试。';
  }

  if (isProjectPausedError(lower)) {
    return 'Supabase 项目可能处于暂停/唤醒中，请等待片刻再试。';
  }

  return null;
}

function translateKnownErrors(
  errorMessage: string,
  language: Language,
): string | null {
  const message = (errorMessage || '').trim();
  if (!message) return null;
  if (language !== 'zh') return null;
  return translateKnownErrorsZh(message.toLowerCase());
}

/**
 * Returns an error detail string only when it's likely written in the current UI language,
 * to avoid mixed-language UI. Otherwise returns null.
 */
export function getSafeErrorDetail(
  errorMessage: string,
  language: Language,
): string | null {
  const message = (errorMessage || '').trim();
  if (!message) return null;

  const hasChinese = containsChinese(message);
  if (language === 'zh') {
    if (hasChinese) return message;

    const translated = translateKnownErrors(message, language);
    if (translated) return translated;

    const code = extractErrorCode(message);
    return code ? `错误码: ${code}` : null;
  }

  if (!hasChinese) return message;

  const code = extractErrorCode(message);
  return code ? `Error code: ${code}` : null;
}

export function getSafeErrorDetailFromUnknown(
  error: unknown,
  language: Language,
): string | null {
  if (error instanceof Error) {
    return getSafeErrorDetail(error.message, language);
  }

  if (typeof error === 'string') {
    return getSafeErrorDetail(error, language);
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const candidateMessage = (error as { message?: unknown }).message;
    if (typeof candidateMessage === 'string') {
      return getSafeErrorDetail(candidateMessage, language);
    }
  }

  return null;
}

/**
 * 将 unknown 类型的错误转换为 Error 对象
 * 消除重复的 `error instanceof Error ? error : new Error(String(error))` 模式
 *
 * @param error - 任意类型的错误
 * @returns Error 对象
 */
export function toError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === 'string') {
    return new Error(error);
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === 'string') {
      return new Error(msg);
    }
  }

  return new Error(String(error));
}

/**
 * 从 unknown 错误中提取错误消息
 *
 * @param error - 任意类型的错误
 * @returns 错误消息字符串
 */
export function getErrorMessage(error: unknown): string {
  return toError(error).message;
}
