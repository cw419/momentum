/**
 * 规则状态管理器
 * 跟踪规则状态，解决乐观更新和ID管理问题
 */

import type { ExceptionRule, ExceptionRuleType } from '../types';
import { RuleCreationController } from './rule-state/RuleCreationController';
import { RuleStateQueries } from './rule-state/RuleStateQueries';
import { RuleStateStore } from './rule-state/RuleStateStore';
import type { IdMapping, PendingRuleCreation, RuleState } from './rule-state/types';

class RuleStateManager {
  private readonly store = new RuleStateStore();
  private readonly creation = new RuleCreationController(this.store);
  private readonly queries = new RuleStateQueries(this.store);
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  generateTemporaryId(): string {
    return this.store.generateTemporaryId();
  }

  generateRealId(): string {
    return this.store.generateRealId();
  }

  trackRuleState(ruleId: string, status: RuleState['status'], temporaryId?: string): void {
    this.store.trackRuleState(ruleId, status, temporaryId);
  }

  getRuleState(ruleId: string): RuleState | undefined {
    return this.store.getRuleState(ruleId);
  }

  startOptimisticCreation(
    name: string,
    type: ExceptionRuleType,
    description?: string
  ): { temporaryRule: ExceptionRule; temporaryId: string } {
    return this.creation.startOptimisticCreation(name, type, description);
  }

  waitForRuleCreation(temporaryId: string): Promise<ExceptionRule> {
    return this.creation.waitForRuleCreation(temporaryId);
  }

  getRealRuleId(temporaryId: string): string | null {
    return this.store.getRealRuleId(temporaryId);
  }

  ruleExists(ruleId: string): Promise<boolean> {
    return this.queries.ruleExists(ruleId);
  }

  getRule(ruleId: string): Promise<ExceptionRule | null> {
    return this.queries.getRule(ruleId);
  }

  validateRuleId(ruleId: string): Promise<{
    isValid: boolean;
    isTemporary: boolean;
    realId?: string;
    error?: string;
  }> {
    return this.queries.validateRuleId(ruleId);
  }

  cleanupExpiredStates(): void {
    this.store.cleanupExpiredStates();
  }

  getAllStates(): {
    states: Map<string, RuleState>;
    pendingCreations: Map<string, PendingRuleCreation>;
    idMappings: Map<string, IdMapping>;
  } {
    return this.store.getAllStates();
  }

  clearAllStates(): void {
    this.store.clearAllStates();
  }

  syncRuleStates(): Promise<void> {
    return this.queries.syncRuleStates();
  }

  start(): void {
    if (this.cleanupInterval) return;

    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredStates();
    }, 5 * 60 * 1000); // 每5分钟清理一次
  }

  stop(): void {
    if (!this.cleanupInterval) return;
    clearInterval(this.cleanupInterval);
    this.cleanupInterval = null;
  }
}

// 创建全局实例
export const ruleStateManager = new RuleStateManager();

