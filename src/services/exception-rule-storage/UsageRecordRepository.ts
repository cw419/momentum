/**
 * 使用记录仓储模块
 * 负责规则使用记录的 CRUD 操作
 */

import {
  RuleUsageRecord,
  ExceptionRuleError,
  ExceptionRuleException
} from '../../types';
import { RulePersistence } from './RulePersistence';

/**
 * 使用记录仓储服务
 */
export class UsageRecordRepository {
  constructor(private persistence: RulePersistence) {}

  /**
   * 获取所有使用记录
   */
  async getUsageRecords(): Promise<RuleUsageRecord[]> {
    try {
      return this.persistence.loadUsageRecords();
    } catch (error) {
      throw new ExceptionRuleException(
        ExceptionRuleError.STORAGE_ERROR,
        '获取使用记录失败',
        error
      );
    }
  }

  /**
   * 获取指定链的使用记录
   */
  async getUsageRecordsByChain(chainId: string): Promise<RuleUsageRecord[]> {
    try {
      const allRecords = await this.getUsageRecords();
      return allRecords.filter(record => record.chainId === chainId);
    } catch (error) {
      throw new ExceptionRuleException(
        ExceptionRuleError.STORAGE_ERROR,
        '获取链使用记录失败',
        error
      );
    }
  }

  /**
   * 根据规则ID获取使用记录
   */
  async getUsageRecordsByRuleId(ruleId: string, limit?: number): Promise<RuleUsageRecord[]> {
    const records = await this.getUsageRecords();
    const recordOrder = new Map(records.map((record, index) => [record.id, index]));

    const filtered = records
      .filter(record => record.ruleId === ruleId)
      .sort((a, b) => {
        const timeDiff = b.usedAt.getTime() - a.usedAt.getTime();
        if (timeDiff !== 0) return timeDiff;
        return (recordOrder.get(b.id) ?? 0) - (recordOrder.get(a.id) ?? 0);
      });

    return limit ? filtered.slice(0, limit) : filtered;
  }

  /**
   * 根据会话ID获取使用记录
   */
  async getUsageRecordsBySessionId(sessionId: string): Promise<RuleUsageRecord[]> {
    const records = await this.getUsageRecords();
    return records.filter(record => record.sessionId === sessionId);
  }

  /**
   * 创建使用记录
   */
  async createUsageRecord(
    record: Omit<RuleUsageRecord, 'id' | 'usedAt'>
  ): Promise<RuleUsageRecord> {
    try {
      const newRecord: RuleUsageRecord = {
        ...record,
        id: this.persistence.generateId(),
        usedAt: new Date()
      };

      const records = await this.getUsageRecords();
      records.push(newRecord);

      this.persistence.saveUsageRecords(records);
      return newRecord;
    } catch (error) {
      throw new ExceptionRuleException(
        ExceptionRuleError.STORAGE_ERROR,
        '创建使用记录失败',
        error
      );
    }
  }

  /**
   * 更新使用记录
   */
  async updateUsageRecord(updatedRecord: RuleUsageRecord): Promise<void> {
    try {
      const records = await this.getUsageRecords();
      const recordIndex = records.findIndex(record => record.id === updatedRecord.id);

      if (recordIndex === -1) {
        return;
      }

      records[recordIndex] = updatedRecord;
      this.persistence.saveUsageRecords(records);
    } catch (error) {
      throw new ExceptionRuleException(
        ExceptionRuleError.STORAGE_ERROR,
        '更新使用记录失败',
        error
      );
    }
  }

  /**
   * 删除使用记录
   */
  async deleteUsageRecord(recordId: string): Promise<void> {
    try {
      const records = await this.getUsageRecords();
      const filteredRecords = records.filter(record => record.id !== recordId);
      this.persistence.saveUsageRecords(filteredRecords);
    } catch (error) {
      throw new ExceptionRuleException(
        ExceptionRuleError.STORAGE_ERROR,
        '删除使用记录失败',
        error
      );
    }
  }

  /**
   * 保存使用记录列表（用于批量操作）
   */
  saveUsageRecords(records: RuleUsageRecord[]): void {
    this.persistence.saveUsageRecords(records);
  }
}
