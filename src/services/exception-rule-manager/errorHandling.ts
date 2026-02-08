import { ExceptionRuleError, ExceptionRuleException } from '../../types';

type WithRuleErrorHandlingOptions = {
  preserveRuleExceptions?: boolean;
};

export async function withRuleErrorHandling<T>(
  operation: () => Promise<T>,
  message: string,
  options: WithRuleErrorHandlingOptions = {},
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (
      options.preserveRuleExceptions &&
      error instanceof ExceptionRuleException
    ) {
      throw error;
    }
    throw new ExceptionRuleException(
      ExceptionRuleError.STORAGE_ERROR,
      message,
      error,
    );
  }
}
