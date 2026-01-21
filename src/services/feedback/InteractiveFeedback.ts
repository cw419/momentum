/**
 * 交互式反馈
 * 负责确认对话框、恢复选项、批量操作反馈
 */

import type { RecoveryAction } from '../ErrorRecoveryManager';
import { getCurrentLanguage, tr } from '../../utils/runtimeI18n';
import { MessageStore } from './MessageStore';
import { FeedbackPresenter } from './FeedbackPresenter';
import type { FeedbackMessage, FeedbackAction } from './types';

export class InteractiveFeedback {
  constructor(
    private readonly store: MessageStore,
    private readonly presenter: FeedbackPresenter
  ) {}

  async showRecoveryOptions(options: RecoveryAction[]): Promise<RecoveryAction | null> {
    return new Promise((resolve) => {
      const messageId = this.store.generateMessageId();

      const actions: FeedbackAction[] = options.map(option => ({
        id: option.id,
        label: option.label,
        type: option.type,
        handler: async () => {
          this.store.removeMessage(messageId);
          resolve(option);
        }
      }));

      actions.push({
        id: 'cancel',
        label: tr('取消', 'Cancel'),
        type: 'secondary',
        handler: () => {
          this.store.removeMessage(messageId);
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

      this.store.addMessage(feedbackMessage);
    });
  }

  async showConfirmation(
    title: string,
    message: string,
    confirmLabel?: string,
    cancelLabel?: string
  ): Promise<boolean> {
    return new Promise((resolve) => {
      const messageId = this.store.generateMessageId();
      const finalConfirmLabel = confirmLabel ?? tr('确认', 'Confirm');
      const finalCancelLabel = cancelLabel ?? tr('取消', 'Cancel');

      const actions: FeedbackAction[] = [
        {
          id: 'confirm',
          label: finalConfirmLabel,
          type: 'primary',
          handler: () => {
            this.store.removeMessage(messageId);
            resolve(true);
          }
        },
        {
          id: 'cancel',
          label: finalCancelLabel,
          type: 'secondary',
          handler: () => {
            this.store.removeMessage(messageId);
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

      this.store.addMessage(feedbackMessage);
    });
  }

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
          this.presenter.showInfo(tr('错误详情', 'Error details', language), errors.join('\n'), false);
        }
      });
    }

    const messageType: FeedbackMessage['type'] = failed > 0 ? 'warning' : 'success';
    const messageId = this.store.generateMessageId();

    this.store.addMessage({
      id: messageId,
      type: messageType,
      title,
      message,
      actions: actions.length > 0 ? actions : undefined,
      autoHide: true,
      duration: 8000,
      timestamp: new Date()
    });

    return messageId;
  }
}
