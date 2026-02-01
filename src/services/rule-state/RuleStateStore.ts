import { logger } from '../../utils/logger';
import { isDev } from '../../utils/env';
import { randomId } from '../../utils/random';
import type { IdMapping, PendingRuleCreation, RuleState, RuleStatus } from './types';

export class RuleStateStore {
  private states = new Map<string, RuleState>();
  private pendingCreations = new Map<string, PendingRuleCreation>();
  private idMappings = new Map<string, IdMapping>();
  private idCounter = 0;

  generateTemporaryId(): string {
    this.idCounter++;
    return `temp_${Date.now()}_${this.idCounter}`;
  }

  generateRealId(): string {
    return randomId('rule');
  }

  trackRuleState(ruleId: string, status: RuleStatus, temporaryId?: string): void {
    const now = new Date();
    const existingState = this.states.get(ruleId);

    const state: RuleState = {
      id: ruleId,
      status,
      temporaryId,
      createdAt: existingState?.createdAt || now,
      updatedAt: now,
      lastValidated: existingState?.lastValidated,
      validationErrors: existingState?.validationErrors,
      realId: existingState?.realId
    };

    this.states.set(ruleId, state);

    if (temporaryId) {
      this.states.set(temporaryId, state);
    }

    if (isDev) {
      logger.debug('RULE_STATE', 'Rule state updated', { ruleId, status, temporaryId, state });
    }
  }

  getRuleState(ruleId: string): RuleState | undefined {
    return this.states.get(ruleId);
  }

  getAllStates(): {
    states: Map<string, RuleState>;
    pendingCreations: Map<string, PendingRuleCreation>;
    idMappings: Map<string, IdMapping>;
  } {
    return {
      states: new Map(this.states),
      pendingCreations: new Map(this.pendingCreations),
      idMappings: new Map(this.idMappings)
    };
  }

  clearAllStates(): void {
    this.states.clear();
    this.pendingCreations.clear();
    this.idMappings.clear();
    this.idCounter = 0;
  }

  setPendingCreation(temporaryId: string, pending: PendingRuleCreation): void {
    this.pendingCreations.set(temporaryId, pending);
  }

  getPendingCreation(temporaryId: string): PendingRuleCreation | undefined {
    return this.pendingCreations.get(temporaryId);
  }

  hasPendingCreation(temporaryId: string): boolean {
    return this.pendingCreations.has(temporaryId);
  }

  deletePendingCreation(temporaryId: string): void {
    this.pendingCreations.delete(temporaryId);
  }

  setIdMapping(temporaryId: string, realId: string): void {
    const mapping: IdMapping = {
      temporaryId,
      realId,
      mappedAt: new Date()
    };
    this.idMappings.set(temporaryId, mapping);
  }

  getRealRuleId(temporaryId: string): string | null {
    const mapping = this.idMappings.get(temporaryId);
    if (mapping) {
      return mapping.realId;
    }

    const state = this.states.get(temporaryId);
    if (state?.realId) {
      return state.realId;
    }

    if (!temporaryId.startsWith('temp_')) {
      return temporaryId;
    }

    return null;
  }

  applyCreationSuccess(temporaryId: string, realId: string): void {
    this.setIdMapping(temporaryId, realId);

    this.trackRuleState(realId, 'active');
    this.trackRuleState(temporaryId, 'active', temporaryId);

    const state = this.states.get(temporaryId);
    if (state) {
      state.realId = realId;
      state.status = 'active';
      this.states.set(temporaryId, state);
      this.states.set(realId, state);
    }
  }

  applyCreationError(temporaryId: string, errorMessage: string): void {
    this.trackRuleState(temporaryId, 'error');

    const state = this.states.get(temporaryId);
    if (state) {
      state.validationErrors = [errorMessage];
      this.states.set(temporaryId, state);
    }
  }

  cleanupExpiredStates(): void {
    const now = Date.now();
    const maxAge = 10 * 60 * 1000; // 10分钟

    for (const [id, state] of this.states.entries()) {
      if (now - state.updatedAt.getTime() > maxAge) {
        this.states.delete(id);
      }
    }

    for (const [tempId, mapping] of this.idMappings.entries()) {
      if (now - mapping.mappedAt.getTime() > maxAge) {
        this.idMappings.delete(tempId);
      }
    }

    for (const [tempId, pending] of this.pendingCreations.entries()) {
      if (now - pending.createdAt.getTime() > maxAge) {
        this.pendingCreations.delete(tempId);
      }
    }
  }

  syncStates(existingRuleIds: Set<string>): void {
    for (const [id] of this.states.entries()) {
      if (!id.startsWith('temp_') && !existingRuleIds.has(id)) {
        this.states.delete(id);
      }
    }
  }
}

