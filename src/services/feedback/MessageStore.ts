/**
 * 消息存储管理
 * 负责消息的存储、检索和监听器管理
 */

import { logger } from '../../utils/logger';
import { toError } from '../../utils/errorMessage';
import type {
  FeedbackMessage,
  ProgressInfo,
  MessageListener,
  ProgressListener,
} from './types';

export class MessageStore {
  private messages = new Map<string, FeedbackMessage>();
  private messageListeners: MessageListener[] = [];
  private progressListeners: ProgressListener[] = [];
  private currentProgress: ProgressInfo | null = null;
  private messageIdCounter = 0;

  generateMessageId(): string {
    return `msg_${Date.now()}_${++this.messageIdCounter}`;
  }

  addMessage(message: FeedbackMessage): void {
    this.messages.set(message.id, message);

    if (message.autoHide && message.duration) {
      setTimeout(() => {
        this.removeMessage(message.id);
      }, message.duration);
    }

    this.notifyMessageListeners();
  }

  removeMessage(messageId: string): void {
    if (this.messages.has(messageId)) {
      this.messages.delete(messageId);
      this.notifyMessageListeners();
    }
  }

  clearMessages(): void {
    this.messages.clear();
    this.notifyMessageListeners();
  }

  clearMessagesByType(type: FeedbackMessage['type']): void {
    for (const [id, message] of this.messages.entries()) {
      if (message.type === type) {
        this.messages.delete(id);
      }
    }
    this.notifyMessageListeners();
  }

  getAllMessages(): FeedbackMessage[] {
    return Array.from(this.messages.values()).sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
    );
  }

  onMessagesChange(listener: MessageListener): () => void {
    this.messageListeners.push(listener);
    listener(this.getAllMessages());

    return () => {
      const index = this.messageListeners.indexOf(listener);
      if (index > -1) {
        this.messageListeners.splice(index, 1);
      }
    };
  }

  private notifyMessageListeners(): void {
    const messages = this.getAllMessages();
    this.messageListeners.forEach((listener) => {
      try {
        listener(messages);
      } catch (error) {
        logger.error(
          'USER_FEEDBACK',
          '消息监听器错误',
          undefined,
          toError(error),
        );
      }
    });
  }

  setProgress(progress: ProgressInfo | null): void {
    this.currentProgress = progress;
    this.notifyProgressListeners();
  }

  getProgress(): ProgressInfo | null {
    return this.currentProgress;
  }

  updateProgress(progress: number, message?: string): void {
    if (this.currentProgress) {
      this.currentProgress.progress = progress;
      if (message) {
        this.currentProgress.message = message;
      }
      this.notifyProgressListeners();
    }
  }

  onProgressChange(listener: ProgressListener): () => void {
    this.progressListeners.push(listener);
    listener(this.currentProgress);

    return () => {
      const index = this.progressListeners.indexOf(listener);
      if (index > -1) {
        this.progressListeners.splice(index, 1);
      }
    };
  }

  private notifyProgressListeners(): void {
    this.progressListeners.forEach((listener) => {
      try {
        listener(this.currentProgress);
      } catch (error) {
        logger.error(
          'USER_FEEDBACK',
          '进度监听器错误',
          undefined,
          toError(error),
        );
      }
    });
  }
}
