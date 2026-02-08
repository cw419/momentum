/**
 * 错误消息格式化器
 * 负责将异常转换为用户友好的消息
 */

import { ExceptionRuleError, ExceptionRuleException } from '../../types';
import { getSafeErrorDetail } from '../../utils/errorMessage';
import { getCurrentLanguage, tr } from '../../utils/runtimeI18n';

export class ErrorMessageFormatter {
  getUserFriendlyMessage(error: ExceptionRuleException): string {
    const language = getCurrentLanguage();
    switch (error.type) {
      case ExceptionRuleError.RULE_NOT_FOUND:
        return this.formatRuleNotFoundMessage(error);

      case ExceptionRuleError.DUPLICATE_RULE_NAME:
        return this.formatDuplicateNameMessage(error);

      case ExceptionRuleError.RULE_TYPE_MISMATCH:
        return this.formatTypeMismatchMessage();

      case ExceptionRuleError.INVALID_RULE_TYPE:
        return tr(
          '规则类型无效，请检查规则设置',
          'Invalid rule type. Please check the rule settings.',
          language,
        );

      case ExceptionRuleError.VALIDATION_ERROR: {
        const safeDetail = getSafeErrorDetail(error.message || '', language);
        return safeDetail
          ? tr(
              `输入验证失败：${safeDetail}`,
              `Validation failed: ${safeDetail}`,
              language,
            )
          : tr('输入验证失败', 'Validation failed', language);
      }

      case ExceptionRuleError.STORAGE_ERROR:
        return tr(
          '数据保存失败，请检查网络连接或重试',
          'Failed to save data. Please check your connection or try again.',
          language,
        );

      default: {
        const safeDetail = getSafeErrorDetail(error.message || '', language);
        return (
          safeDetail ??
          tr('发生了未知错误', 'An unknown error occurred.', language)
        );
      }
    }
  }

  getErrorTitle(errorType: ExceptionRuleError): string {
    const language = getCurrentLanguage();
    switch (errorType) {
      case ExceptionRuleError.RULE_NOT_FOUND:
        return tr('规则不存在', 'Rule not found', language);
      case ExceptionRuleError.DUPLICATE_RULE_NAME:
        return tr('规则名称重复', 'Duplicate rule name', language);
      case ExceptionRuleError.RULE_TYPE_MISMATCH:
        return tr('规则类型不匹配', 'Rule type mismatch', language);
      case ExceptionRuleError.INVALID_RULE_TYPE:
        return tr('规则类型无效', 'Invalid rule type', language);
      case ExceptionRuleError.VALIDATION_ERROR:
        return tr('输入验证失败', 'Validation failed', language);
      case ExceptionRuleError.STORAGE_ERROR:
        return tr('数据保存失败', 'Save failed', language);
      default:
        return tr('操作失败', 'Operation failed', language);
    }
  }

  private formatRuleNotFoundMessage(error: ExceptionRuleException): string {
    const language = getCurrentLanguage();
    const message = error.message;

    if (message.includes('ID')) {
      return tr(
        '所选的规则不存在，可能已被删除。请选择其他规则或创建新规则。',
        'The selected rule no longer exists. It may have been deleted. Please choose another rule or create a new one.',
        language,
      );
    }

    return tr(
      '规则不存在或已被删除，请选择其他规则或创建新规则。',
      'The rule does not exist or has been deleted. Please choose another rule or create a new one.',
      language,
    );
  }

  private formatDuplicateNameMessage(error: ExceptionRuleException): string {
    const language = getCurrentLanguage();
    const existingRules =
      error.details && typeof error.details === 'object'
        ? (error.details as { existingRules?: unknown }).existingRules
        : undefined;
    const hasExistingRules =
      Array.isArray(existingRules) && existingRules.length > 0;

    if (hasExistingRules) {
      return tr(
        '规则名称已存在。您可以使用现有规则或为新规则选择不同的名称。',
        'This rule name already exists. You can use the existing rule or choose a different name.',
        language,
      );
    }

    return tr(
      '规则名称已存在，请选择不同的名称或使用现有规则。',
      'This rule name already exists. Please choose a different name or use the existing rule.',
      language,
    );
  }

  private formatTypeMismatchMessage(): string {
    const language = getCurrentLanguage();
    return tr(
      '规则类型与当前操作不匹配，请选择正确类型的规则。',
      'This rule type does not match the current action. Please choose a compatible rule type.',
      language,
    );
  }
}
