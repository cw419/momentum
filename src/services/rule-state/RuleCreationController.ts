import type { ExceptionRule, ExceptionRuleType } from '../../types';
import { ExceptionRuleError, ExceptionRuleException } from '../../types';
import { exceptionRuleStorage } from '../ExceptionRuleStorage';
import { logger } from '../../utils/logger';
import { toError, getErrorMessage } from '../../utils/errorMessage';
import type { PendingRuleCreation } from './types';
import { RuleStateStore } from './RuleStateStore';

export class RuleCreationController {
  constructor(private readonly store: RuleStateStore) {}

  startOptimisticCreation(
    name: string,
    type: ExceptionRuleType,
    description?: string
  ): { temporaryRule: ExceptionRule; temporaryId: string } {
    const temporaryId = this.store.generateTemporaryId();
    const now = new Date();

    const temporaryRule: ExceptionRule = {
      id: temporaryId,
      name,
      type,
      description,
      scope: 'global',
      chainId: undefined,
      createdAt: now,
      lastUsedAt: undefined,
      usageCount: 0,
      isActive: true,
      isArchived: false
    };

    this.store.trackRuleState(temporaryId, 'creating');

    const creationPromise = this.performActualCreation(temporaryRule);

    const pendingCreation: PendingRuleCreation = {
      temporaryId,
      name,
      type,
      description,
      createdAt: now,
      promise: creationPromise
    };

    this.store.setPendingCreation(temporaryId, pendingCreation);

    creationPromise
      .then(realRule => {
        this.handleCreationSuccess(temporaryId, realRule);
      })
      .catch(error => {
        this.handleCreationError(temporaryId, error);
      });

    return { temporaryRule, temporaryId };
  }

  async waitForRuleCreation(temporaryId: string): Promise<ExceptionRule> {
    const pending = this.store.getPendingCreation(temporaryId);
    if (!pending) {
      throw new ExceptionRuleException(
        ExceptionRuleError.RULE_NOT_FOUND,
        `临时规则 ${temporaryId} 不存在`
      );
    }

    try {
      const realRule = await pending.promise;
      return realRule;
    } catch (error) {
      throw new ExceptionRuleException(
        ExceptionRuleError.STORAGE_ERROR,
        `规则创建失败: ${getErrorMessage(error)}`,
        error
      );
    }
  }

  private async performActualCreation(temporaryRule: ExceptionRule): Promise<ExceptionRule> {
    try {
      const realId = this.store.generateRealId();

      const realRule = await exceptionRuleStorage.createRule({
        name: temporaryRule.name,
        type: temporaryRule.type,
        description: temporaryRule.description,
        scope: temporaryRule.scope,
        chainId: temporaryRule.chainId,
        isArchived: temporaryRule.isArchived || false
      });

      if (realRule.id !== realId) {
        realRule.id = realId;
      }

      return realRule;
    } catch (error) {
      throw new ExceptionRuleException(
        ExceptionRuleError.STORAGE_ERROR,
        `创建规则失败: ${getErrorMessage(error)}`,
        error
      );
    }
  }

  private handleCreationSuccess(temporaryId: string, realRule: ExceptionRule): void {
    logger.info('RULE_STATE', '规则创建成功', { temporaryId, realId: realRule.id });

    this.store.applyCreationSuccess(temporaryId, realRule.id);
    this.store.deletePendingCreation(temporaryId);
  }

  private handleCreationError(temporaryId: string, error: unknown): void {
    const err = toError(error);
    logger.error('RULE_STATE', `规则创建失败: ${temporaryId}`, undefined, err);

    this.store.applyCreationError(temporaryId, err.message);
    this.store.deletePendingCreation(temporaryId);
  }
}

