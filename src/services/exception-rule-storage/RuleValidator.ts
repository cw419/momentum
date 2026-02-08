/**
 * 规则验证模块
 * 负责验证规则数据的完整性和有效性
 */

import {
  ExceptionRule,
  ExceptionRuleError,
  ExceptionRuleException,
  ExceptionRuleType,
} from '../../types';
import { logger } from '../../utils/logger';
import { isDev } from '../../utils/env';

/**
 * 规则创建时的输入类型
 */
export type ExceptionRuleCreateInput = Pick<ExceptionRule, 'name' | 'type'> &
  Partial<
    Pick<ExceptionRule, 'description' | 'chainId' | 'scope' | 'isArchived'>
  >;

/**
 * 规范化后的规则输入
 */
interface NormalizedRuleInput {
  name: string;
  type: ExceptionRuleType;
  description?: string;
  scope: ExceptionRule['scope'];
  chainId?: string;
  isArchived?: boolean;
}

/**
 * 规则验证服务
 */
export class RuleValidator {
  /**
   * 验证规则数据
   * @param rule 规则数据
   * @param isCreating 是否为创建模式
   */
  validateRule(
    rule: Partial<ExceptionRule>,
    isCreating: boolean = false,
  ): void {
    if (isDev) {
      logger.debug('RULE_VALIDATOR', 'validateRule called', {
        isCreating,
        rule: {
          id: rule.id,
          name: rule.name,
          type: rule.type,
          scope: rule.scope,
          chainId: rule.chainId,
        },
      });
    }

    this.validateName(rule.name, isCreating);
    this.validateType(rule, isCreating);
    this.validateDescription(rule.description);

    if (isCreating) {
      this.validateScopeForCreation(rule);
    }
  }

  /**
   * 验证规则名称
   */
  private validateName(name: string | undefined, isCreating: boolean): void {
    if (name !== undefined) {
      if (name.trim().length === 0) {
        throw new ExceptionRuleException(
          ExceptionRuleError.VALIDATION_ERROR,
          '规则名称不能为空',
        );
      }

      if (name.length > 100) {
        throw new ExceptionRuleException(
          ExceptionRuleError.VALIDATION_ERROR,
          '规则名称不能超过100个字符',
        );
      }
    } else if (isCreating) {
      throw new ExceptionRuleException(
        ExceptionRuleError.VALIDATION_ERROR,
        '规则名称不能为空',
      );
    }
  }

  /**
   * 验证规则类型
   */
  private validateType(
    rule: Partial<ExceptionRule>,
    isCreating: boolean,
  ): void {
    if (isCreating && !rule.type) {
      logger.error('RULE_VALIDATOR', '规则类型验证失败', {
        isCreating,
        id: rule.id,
        name: rule.name,
        scope: rule.scope,
        chainId: rule.chainId,
        typeValue: rule.type,
        typeOf: typeof rule.type,
      });
      throw new ExceptionRuleException(
        ExceptionRuleError.VALIDATION_ERROR,
        `规则类型不能为空。接收到的类型: ${rule.type} (${typeof rule.type})`,
      );
    }

    if (
      rule.type !== undefined &&
      !Object.values(ExceptionRuleType).includes(rule.type)
    ) {
      throw new ExceptionRuleException(
        ExceptionRuleError.INVALID_RULE_TYPE,
        `无效的规则类型: ${rule.type}`,
      );
    }
  }

  /**
   * 验证规则描述
   */
  private validateDescription(description: string | undefined): void {
    if (description && description.length > 500) {
      throw new ExceptionRuleException(
        ExceptionRuleError.VALIDATION_ERROR,
        '规则描述不能超过500个字符',
      );
    }
  }

  /**
   * 验证创建时的作用域设置
   */
  private inferScope(
    scope: ExceptionRule['scope'] | undefined,
    chainId: string | undefined,
  ): ExceptionRule['scope'] {
    if (scope === 'chain' || scope === 'global') return scope;
    if (typeof chainId === 'string' && chainId.trim().length > 0)
      return 'chain';
    return 'global';
  }

  private validateScopeForCreation(rule: Partial<ExceptionRule>): void {
    if (
      rule.scope !== undefined &&
      rule.scope !== 'chain' &&
      rule.scope !== 'global'
    ) {
      throw new ExceptionRuleException(
        ExceptionRuleError.VALIDATION_ERROR,
        '规则作用域必须为 "chain" 或 "global"',
      );
    }

    const inferredScope = this.inferScope(rule.scope, rule.chainId);

    if (
      inferredScope === 'chain' &&
      (!rule.chainId || rule.chainId.trim().length === 0)
    ) {
      throw new ExceptionRuleException(
        ExceptionRuleError.VALIDATION_ERROR,
        '链专属规则必须指定 chainId',
      );
    }
  }

  /**
   * 规范化规则输入数据
   */
  normalizeRuleInput(rule: ExceptionRuleCreateInput): NormalizedRuleInput {
    const normalizedChainId =
      typeof rule.chainId === 'string' && rule.chainId.trim().length > 0
        ? rule.chainId
        : undefined;

    const scope = this.inferScope(rule.scope, normalizedChainId);

    return {
      name: rule.name,
      type: rule.type,
      description: rule.description?.trim() || undefined,
      scope,
      chainId: scope === 'chain' ? normalizedChainId : undefined,
      isArchived: rule.isArchived,
    };
  }

  /**
   * 检查规则名称是否重复
   */
  checkDuplicateName(
    existingRules: ExceptionRule[],
    normalizedRule: NormalizedRuleInput,
    excludeId?: string,
  ): boolean {
    return existingRules.some((r) => {
      if (r.name !== normalizedRule.name || !r.isActive) return false;
      if (excludeId && r.id === excludeId) return false;

      if (normalizedRule.scope === 'chain') {
        return r.scope === 'chain' && r.chainId === normalizedRule.chainId;
      }

      return r.scope === 'global';
    });
  }
}

export const ruleValidator = new RuleValidator();
