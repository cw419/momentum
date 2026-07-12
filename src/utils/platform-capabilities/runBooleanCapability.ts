import { logger } from '../logger';

export async function runBooleanCapability(params: {
  supported: boolean;
  unsupportedMessage: string;
  failureMessage: string;
  context?: Record<string, unknown>;
  operation: () => Promise<void>;
}): Promise<boolean> {
  if (!params.supported) {
    logger.warn(
      'PLATFORM_CAPABILITIES',
      params.unsupportedMessage,
      params.context,
    );
    return false;
  }
  try {
    await params.operation();
    return true;
  } catch (error) {
    const normalized =
      error instanceof Error ? error : new Error(String(error));
    logger.error(
      'PLATFORM_CAPABILITIES',
      params.failureMessage,
      params.context,
      normalized,
    );
    return false;
  }
}
