/**
 * 用户反馈处理器
 * 提供用户友好的错误信息显示和操作反馈
 */

import { 
  ExceptionRuleError, 
  ExceptionRuleException 
} from '../types';
import { errorRecoveryManager, RecoveryAction } from './ErrorRecoveryManager';
import { logger } from '../utils/logger';
import { getSafeErrorDetail, toError } from '../utils/errorMessage';
import { getCurrentLanguage, tr } from '../utils/runtimeI18n';

export interface FeedbackMessage {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success' | 'loading';
  title: string;
  message: string;
  actions?: FeedbackAction[];
  persistent?: boolean;
  autoHide?: boolean;
  duration?: number;
  timestamp: Date;
}

export interface FeedbackAction {
  id: string;
  label: string;
  type: 'primary' | 'secondary' | 'danger';
  handler: () => void | Promise<void>;
}

export interface ProgressInfo {
  operation: string;
  progress?: number;
  message?: string;
  isIndeterminate?: boolean;
}

export class UserFeedbackHandler {
  private messages = new Map<string, FeedbackMessage>();
  private messageListeners: Array<(messages: FeedbackMessage[]) => void> = [];
  private progressListeners: Array<(progress: ProgressInfo | null) => void> = [];
  private currentProgress: ProgressInfo | null = null;
  private messageIdCounter = 0;

  /**
   * 显示用户友好的错误信息
   */
  showErrorMessage(error: ExceptionRuleException, context?: unknown): string {
    void context;
    const messageId = this.generateMessageId();
    const userFriendlyMessage = this.getUserFriendlyMessage(error);
    const recoveryActions = errorRecoveryManager.getRecoveryOptions(error);

    const feedbackMessage: FeedbackMessage = {
      id: messageId,
      type: 'error',
      title: this.getErrorTitle(error.type),
      message: userFriendlyMessage,
      actions: this.convertRecoveryActionsToFeedbackActions(recoveryActions),
      persistent: true,
      timestamp: new Date()
    };

    this.addMessage(feedbackMessage);
    return messageId;
  }

  /**
   * 显示警告信息
   */
  showWarning(title: string, message: string, actions?: FeedbackAction[]): string {
    const messageId = this.generateMessageId();
    
    const feedbackMessage: FeedbackMessage = {
      id: messageId,
      type: 'warning',
      title,
      message,
      actions,
      autoHide: true,
      duration: 8000,
      timestamp: new Date()
    };

    this.addMessage(feedbackMessage);
    return messageId;
  }

  /**
   * 显示信息提示
   */
  showInfo(title: string, message: string, autoHide: boolean = true): string {
    const messageId = this.generateMessageId();
    
    const feedbackMessage: FeedbackMessage = {
      id: messageId,
      type: 'info',
      title,
      message,
      autoHide,
      duration: autoHide ? 5000 : undefined,
      timestamp: new Date()
    };

    this.addMessage(feedbackMessage);
    return messageId;
  }

  /**
   * 显示成功信息
   */
  showSuccess(title: string, message: string, autoHide: boolean = true): string {
    const messageId = this.generateMessageId();
    
    const feedbackMessage: FeedbackMessage = {
      id: messageId,
      type: 'success',
      title,
      message,
      autoHide,
      duration: autoHide ? 3000 : undefined,
      timestamp: new Date()
    };

    this.addMessage(feedbackMessage);
    return messageId;
  }

  /**
   * 显示恢复选项
   */
  async showRecoveryOptions(options: RecoveryAction[]): Promise<RecoveryAction | null> {
    return new Promise((resolve) => {
      const messageId = this.generateMessageId();
      
      const actions: FeedbackAction[] = options.map(option => ({
        id: option.id,
        label: option.label,
        type: option.type,
        handler: async () => {
          this.removeMessage(messageId);
          resolve(option);
        }
      }));

      // 添加取消选项
      actions.push({
        id: 'cancel',
        label: tr('取消', 'Cancel'),
        type: 'secondary',
        handler: () => {
          this.removeMessage(messageId);
          resolve(null);
        }
      });

      const feedbackMessage: FeedbackMessage = {
        id: messageId,
        type: 'warning',
        title: tr('选择恢复操作', 'Choose a recovery action'),
        message: tr('请选择如何处理这个问题：', 'Choose how to handle this issue:'),
        actions,
        persistent: true,
        timestamp: new Date()
      };

      this.addMessage(feedbackMessage);
    });
  }

  /**
   * 显示操作进度
   */
  showProgress(operation: string, progress?: number, message?: string): void {
    this.currentProgress = {
      operation,
      progress,
      message,
      isIndeterminate: progress === undefined
    };

    this.notifyProgressListeners();
  }

  /**
   * 隐藏进度指示器
   */
  hideProgress(): void {
    this.currentProgress = null;
    this.notifyProgressListeners();
  }

  /**
   * 更新进度
   */
  updateProgress(progress: number, message?: string): void {
    if (this.currentProgress) {
      this.currentProgress.progress = progress;
      if (message) {
        this.currentProgress.message = message;
      }
      this.notifyProgressListeners();
    }
  }

  /**
   * 清除指定消息
   */
  removeMessage(messageId: string): void {
    if (this.messages.has(messageId)) {
      this.messages.delete(messageId);
      this.notifyMessageListeners();
    }
  }

  /**
   * 清除所有消息
   */
  clearMessages(): void {
    this.messages.clear();
    this.notifyMessageListeners();
  }

  /**
   * 清除指定类型的消息
   */
  clearMessagesByType(type: FeedbackMessage['type']): void {
    for (const [id, message] of this.messages.entries()) {
      if (message.type === type) {
        this.messages.delete(id);
      }
    }
    this.notifyMessageListeners();
  }

  /**
   * 获取所有消息
   */
  getAllMessages(): FeedbackMessage[] {
    return Array.from(this.messages.values()).sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
  }

  /**
   * 订阅消息变化
   */
  onMessagesChange(listener: (messages: FeedbackMessage[]) => void): () => void {
    this.messageListeners.push(listener);
    
    // 立即调用一次
    listener(this.getAllMessages());
    
    // 返回取消订阅函数
    return () => {
      const index = this.messageListeners.indexOf(listener);
      if (index > -1) {
        this.messageListeners.splice(index, 1);
      }
    };
  }

  /**
   * 订阅进度变化
   */
  onProgressChange(listener: (progress: ProgressInfo | null) => void): () => void {
    this.progressListeners.push(listener);
    
    // 立即调用一次
    listener(this.currentProgress);
    
    // 返回取消订阅函数
    return () => {
      const index = this.progressListeners.indexOf(listener);
      if (index > -1) {
        this.progressListeners.splice(index, 1);
      }
    };
  }

  /**
   * 获取用户友好的错误信息
   */
  private getUserFriendlyMessage(error: ExceptionRuleException): string {
    const language = getCurrentLanguage();
    switch (error.type) {
      case ExceptionRuleError.RULE_NOT_FOUND:
        return this.formatRuleNotFoundMessage(error);
      
      case ExceptionRuleError.DUPLICATE_RULE_NAME:
        return this.formatDuplicateNameMessage(error);
      
      case ExceptionRuleError.RULE_TYPE_MISMATCH:
        return this.formatTypeMismatchMessage(error);
      
      case ExceptionRuleError.INVALID_RULE_TYPE:
        return tr('规则类型无效，请检查规则设置', 'Invalid rule type. Please check the rule settings.', language);
      
      case ExceptionRuleError.VALIDATION_ERROR:
        {
          const safeDetail = getSafeErrorDetail(error.message || '', language);
          return safeDetail
            ? tr(`输入验证失败：${safeDetail}`, `Validation failed: ${safeDetail}`, language)
            : tr('输入验证失败', 'Validation failed', language);
        }
      
      case ExceptionRuleError.STORAGE_ERROR:
        return tr('数据保存失败，请检查网络连接或重试', 'Failed to save data. Please check your connection or try again.', language);
      
      default:
        {
          const safeDetail = getSafeErrorDetail(error.message || '', language);
          return safeDetail ?? tr('发生了未知错误', 'An unknown error occurred.', language);
        }
    }
  }

  /**
   * 格式化规则不存在的错误信息
   */
  private formatRuleNotFoundMessage(error: ExceptionRuleException): string {
    const language = getCurrentLanguage();
    const message = error.message;
    
    if (message.includes('ID')) {
      return tr(
        '所选的规则不存在，可能已被删除。请选择其他规则或创建新规则。',
        'The selected rule no longer exists. It may have been deleted. Please choose another rule or create a new one.',
        language
      );
    }
    
    return tr(
      '规则不存在或已被删除，请选择其他规则或创建新规则。',
      'The rule does not exist or has been deleted. Please choose another rule or create a new one.',
      language
    );
  }

  /**
   * 格式化重复名称的错误信息
   */
  private formatDuplicateNameMessage(error: ExceptionRuleException): string {
    const language = getCurrentLanguage();
    const existingRules =
      error.details && typeof error.details === 'object'
        ? (error.details as { existingRules?: unknown }).existingRules
        : undefined;
    const hasExistingRules = Array.isArray(existingRules) && existingRules.length > 0;
    
    if (hasExistingRules) {
      return tr(
        '规则名称已存在。您可以使用现有规则或为新规则选择不同的名称。',
        'This rule name already exists. You can use the existing rule or choose a different name.',
        language
      );
    }
    
    return tr(
      '规则名称已存在，请选择不同的名称或使用现有规则。',
      'This rule name already exists. Please choose a different name or use the existing rule.',
      language
    );
  }

  /**
   * 格式化类型不匹配的错误信息
   */
  private formatTypeMismatchMessage(error: ExceptionRuleException): string {
    const language = getCurrentLanguage();
    const message = error.message;
    void message;
    
    return tr(
      '规则类型与当前操作不匹配，请选择正确类型的规则。',
      'This rule type does not match the current action. Please choose a compatible rule type.',
      language
    );
  }

  /**
   * 获取错误标题
   */
  private getErrorTitle(errorType: ExceptionRuleError): string {
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

  /**
   * 转换恢复操作为反馈操作
   */
  private convertRecoveryActionsToFeedbackActions(recoveryActions: RecoveryAction[]): FeedbackAction[] {
    return recoveryActions.map(action => ({
      id: action.id,
      label: action.label,
      type: action.type,
      handler: async () => {
        try {
          this.showProgress(action.description);
          const result = await action.handler();
          this.hideProgress();
          
          if (result.success) {
            this.showSuccess(tr('操作成功', 'Success'), result.message);
          } else {
            this.showWarning(tr('操作未完成', 'Not completed'), result.message);
          }
        } catch (error) {
          this.hideProgress();
          const language = getCurrentLanguage();
          this.showErrorMessage(
            error instanceof ExceptionRuleException 
              ? error 
              : new ExceptionRuleException(
                  ExceptionRuleError.STORAGE_ERROR,
                  error instanceof Error
                    ? (getSafeErrorDetail(error.message, language) ?? tr('操作失败', 'Operation failed', language))
                    : tr('操作失败', 'Operation failed', language)
                )
          );
        }
      }
    }));
  }

  /**
   * 生成消息ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${++this.messageIdCounter}`;
  }

  /**
   * 添加消息
   */
  private addMessage(message: FeedbackMessage): void {
    this.messages.set(message.id, message);
    
    // 设置自动隐藏
    if (message.autoHide && message.duration) {
      setTimeout(() => {
        this.removeMessage(message.id);
      }, message.duration);
    }
    
    this.notifyMessageListeners();
  }

  /**
   * 通知消息监听器
   */
  private notifyMessageListeners(): void {
    const messages = this.getAllMessages();
    this.messageListeners.forEach(listener => {
      try {
        listener(messages);
      } catch (error) {
        logger.error('USER_FEEDBACK', '消息监听器错误', undefined, toError(error));
      }
    });
  }

  /**
   * 通知进度监听器
   */
  private notifyProgressListeners(): void {
    this.progressListeners.forEach(listener => {
      try {
        listener(this.currentProgress);
      } catch (error) {
        logger.error('USER_FEEDBACK', '进度监听器错误', undefined, toError(error));
      }
    });
  }

  /**
   * 显示确认对话框
   */
  async showConfirmation(
    title: string, 
    message: string, 
    confirmLabel?: string,
    cancelLabel?: string
  ): Promise<boolean> {
    return new Promise((resolve) => {
      const messageId = this.generateMessageId();
      const finalConfirmLabel = confirmLabel ?? tr('确认', 'Confirm');
      const finalCancelLabel = cancelLabel ?? tr('取消', 'Cancel');
      
      const actions: FeedbackAction[] = [
        {
          id: 'confirm',
          label: finalConfirmLabel,
          type: 'primary',
          handler: () => {
            this.removeMessage(messageId);
            resolve(true);
          }
        },
        {
          id: 'cancel',
          label: finalCancelLabel,
          type: 'secondary',
          handler: () => {
            this.removeMessage(messageId);
            resolve(false);
          }
        }
      ];

      const feedbackMessage: FeedbackMessage = {
        id: messageId,
        type: 'warning',
        title,
        message,
        actions,
        persistent: true,
        timestamp: new Date()
      };

      this.addMessage(feedbackMessage);
    });
  }

  /**
   * 批量操作反馈
   */
  showBatchOperationFeedback(
    operation: string,
    total: number,
    success: number,
    failed: number,
    errors?: string[]
  ): string {
    const language = getCurrentLanguage();
    const title = language === 'zh' ? `${operation}完成` : `${operation} completed`;
    let message = language === 'zh'
      ? `总计 ${total} 项，成功 ${success} 项`
      : `Total ${total}, succeeded ${success}`;
    
    if (failed > 0) {
      message += language === 'zh' ? `，失败 ${failed} 项` : `, failed ${failed}`;
    }

    const actions: FeedbackAction[] = [];
    
    if (errors && errors.length > 0) {
      actions.push({
        id: 'show_errors',
        label: tr('查看错误详情', 'View error details', language),
        type: 'secondary',
        handler: () => {
          this.showInfo(tr('错误详情', 'Error details', language), errors.join('\n'), false);
        }
      });
    }

    const messageType: FeedbackMessage['type'] = failed > 0 ? 'warning' : 'success';
    
    return this.addMessageAndReturn({
      id: this.generateMessageId(),
      type: messageType,
      title,
      message,
      actions: actions.length > 0 ? actions : undefined,
      autoHide: true,
      duration: 8000,
      timestamp: new Date()
    });
  }

  /**
   * 添加消息并返回ID
   */
  private addMessageAndReturn(message: FeedbackMessage): string {
    this.addMessage(message);
    return message.id;
  }
}

// 创建全局实例
export const userFeedbackHandler = new UserFeedbackHandler();
