/**
 * 规则持久化模块
 * 负责规则和使用记录的存储读写操作
 */

import {
  ExceptionRule,
  RuleUsageRecord,
  ExceptionRuleError,
  ExceptionRuleException
} from '../../types';
import { localPreferences } from '../../utils/localPreferences';

/**
 * 序列化的规则格式（存储时使用）
 */
interface SerializedRule extends Omit<ExceptionRule, 'createdAt' | 'lastUsedAt'> {
  createdAt: string;
  lastUsedAt?: string | null;
}

/**
 * 序列化的使用记录格式
 */
interface SerializedUsageRecord extends Omit<RuleUsageRecord, 'usedAt'> {
  usedAt: string;
}

/**
 * 规则持久化服务
 */
export class RulePersistence {
  /**
   * 从存储读取规则列表
   */
  loadRules(): ExceptionRule[] {
    const data = localPreferences.getExceptionRules();
    if (!data) return [];

    const rules = JSON.parse(data) as SerializedRule[];
    return rules.map((rule) => this.deserializeRule(rule));
  }

  /**
   * 保存规则列表到存储
   */
  saveRules(rules: ExceptionRule[]): void {
    try {
      localPreferences.setExceptionRules(JSON.stringify(rules));
    } catch (error) {
      throw new ExceptionRuleException(
        ExceptionRuleError.STORAGE_ERROR,
        '保存规则失败',
        error
      );
    }
  }

  /**
   * 从存储读取使用记录列表
   */
  loadUsageRecords(): RuleUsageRecord[] {
    const data = localPreferences.getExceptionRulesUsage();
    if (!data) return [];

    const records = JSON.parse(data) as SerializedUsageRecord[];
    return records.map(record => this.deserializeUsageRecord(record));
  }

  /**
   * 保存使用记录列表到存储
   */
  saveUsageRecords(records: RuleUsageRecord[]): void {
    try {
      localPreferences.setExceptionRulesUsage(JSON.stringify(records));
    } catch (error) {
      throw new ExceptionRuleException(
        ExceptionRuleError.STORAGE_ERROR,
        '保存使用记录失败',
        error
      );
    }
  }

  /**
   * 生成唯一ID
   */
  generateId(): string {
    return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 反序列化规则数据
   */
  private deserializeRule(rule: SerializedRule): ExceptionRule {
    const normalizedChainId =
      typeof rule.chainId === 'string' && rule.chainId.trim().length > 0
        ? rule.chainId
        : undefined;

    const normalizedScope: ExceptionRule['scope'] =
      rule.scope === 'chain' || rule.scope === 'global'
        ? rule.scope
        : normalizedChainId
          ? 'chain'
          : 'global';

    return {
      ...rule,
      chainId: normalizedScope === 'chain' ? normalizedChainId : undefined,
      scope: normalizedScope,
      createdAt: new Date(rule.createdAt),
      lastUsedAt: rule.lastUsedAt ? new Date(rule.lastUsedAt) : undefined,
    };
  }

  /**
   * 反序列化使用记录
   */
  private deserializeUsageRecord(record: SerializedUsageRecord): RuleUsageRecord {
    return {
      ...record,
      usedAt: new Date(record.usedAt)
    };
  }
}

export const rulePersistence = new RulePersistence();
