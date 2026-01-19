/**
 * ExceptionRuleManager - 统一的例外规则管理协调器
 *
 * 此类作为外部接口的统一入口，委托到各专门服务：
 * - RuleCreator: 规则创建逻辑
 * - RuleQueryService: 规则查询逻辑
 * - RuleExecutor: 规则执行/使用逻辑
 * - RuleStatsService: 统计逻辑
 * - RuleExportImportService: 导入导出逻辑
 * - RuleMaintenanceService: 维护和健康检查
 *
 * 保持向后兼容性，现有代码无需修改即可使用
 */

import {
  ExceptionRule,
  ExceptionRuleType,
  PauseOptions,
  RuleUsageRecord,
  SessionContext,
  RuleUsageStats,
  OverallUsageStats
} from '../types';
import { dataIntegrityChecker } from './DataIntegrityChecker';
import { ruleStateManager } from './RuleStateManager';
import { enhancedRuleValidationService } from './EnhancedRuleValidationService';
import { enhancedDuplicationHandler } from './EnhancedDuplicationHandler';
import { logger } from '../utils/logger';
import { toError } from '../utils/errorMessage';

import {
  ruleCreator,
  ruleQueryService,
  ruleExecutor,
  ruleStatsService,
  ruleExportImportService,
  ruleMaintenanceService,
  type RuleCreationResult,
  type RealTimeCheckResult,
  type OptimisticCreationResult,
  type DuplicationSuggestions,
  type RuleUsageSuggestions,
  type RuleExecutionResult,
  type RuleTypeStats,
  type ImportResult,
  type ExportResult,
  type CleanupResult,
  type SystemHealthStatus
} from './rule-manager';

export class ExceptionRuleManager {
  private initialized = false;

  /**
   * 初始化管理器
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const integrityReport = await dataIntegrityChecker.checkRuleDataIntegrity();

      if (integrityReport.issues.length > 0) {
        logger.warn('EXCEPTION_RULE_MANAGER', 'Data integrity issues found', { summary: integrityReport.summary });

        const autoFixableIssues = integrityReport.issues.filter(issue => issue.autoFixable);
        if (autoFixableIssues.length > 0) {
          const fixResults = await dataIntegrityChecker.autoFixIssues(autoFixableIssues);
          const successCount = fixResults.filter(r => r.success).length;
          logger.info('EXCEPTION_RULE_MANAGER', 'Auto-fixed data issues', { successCount, total: autoFixableIssues.length });
        }
      }

      await ruleStateManager.syncRuleStates();
      enhancedRuleValidationService.cleanupExpiredCache();
      enhancedDuplicationHandler.clearCache();

      ruleExportImportService.setRuleUpdater(ruleMaintenanceService);
      ruleExportImportService.setRuleCreator(ruleCreator);

      this.initialized = true;
      logger.info('EXCEPTION_RULE_MANAGER', 'Initialization completed');

    } catch (error) {
      const err = toError(error);
      logger.error('EXCEPTION_RULE_MANAGER', 'Initialization failed', undefined, err);
      throw error;
    }
  }

  // ==================== Creation Methods ====================

  async createRule(
    name: string,
    type: ExceptionRuleType,
    description?: string,
    userChoice?: 'use_existing' | 'modify_name' | 'create_anyway'
  ): Promise<RuleCreationResult> {
    await this.initialize();
    return ruleCreator.createRule(name, type, description, userChoice);
  }

  async createChainRule(
    chainId: string,
    name: string,
    type: ExceptionRuleType,
    description?: string
  ): Promise<RuleCreationResult> {
    await this.initialize();
    return ruleCreator.createChainRule(chainId, name, type, description);
  }

  createRuleOptimistic(
    name: string,
    type: ExceptionRuleType,
    description?: string
  ): OptimisticCreationResult {
    return ruleCreator.createRuleOptimistic(name, type, description);
  }

  async checkRuleNameRealTime(name: string, excludeId?: string): Promise<RealTimeCheckResult> {
    return ruleCreator.checkRuleNameRealTime(name, excludeId);
  }

  // ==================== Query Methods ====================

  async getRuleById(id: string): Promise<ExceptionRule | null> {
    return ruleQueryService.getRuleById(id);
  }

  async getAllRules(): Promise<ExceptionRule[]> {
    return ruleQueryService.getAllRules();
  }

  async getRulesByType(type: ExceptionRuleType): Promise<ExceptionRule[]> {
    return ruleQueryService.getRulesByType(type);
  }

  async getRulesForAction(actionType: 'pause' | 'early_completion'): Promise<ExceptionRule[]> {
    return ruleQueryService.getRulesForAction(actionType);
  }

  async searchRules(
    query: string,
    type?: ExceptionRuleType,
    actionType?: 'pause' | 'early_completion'
  ): Promise<ExceptionRule[]> {
    return ruleQueryService.searchRules(query, type, actionType);
  }

  async getRuleUsageSuggestions(actionType: 'pause' | 'early_completion'): Promise<RuleUsageSuggestions> {
    return ruleQueryService.getRuleUsageSuggestions(actionType);
  }

  async getDuplicationSuggestions(name: string, excludeId?: string): Promise<DuplicationSuggestions> {
    return ruleQueryService.getDuplicationSuggestions(name, excludeId);
  }

  // ==================== Execution Methods ====================

  async useRule(
    ruleId: string,
    sessionContext: SessionContext,
    actionType: 'pause' | 'early_completion',
    pauseOptions?: PauseOptions
  ): Promise<RuleExecutionResult> {
    return ruleExecutor.useRule(ruleId, sessionContext, actionType, pauseOptions);
  }

  async validateRuleForAction(ruleId: string, actionType: 'pause' | 'early_completion'): Promise<boolean> {
    return ruleExecutor.validateRuleForAction(ruleId, actionType);
  }

  // ==================== Stats Methods ====================

  async getRuleStats(ruleId: string): Promise<RuleUsageStats> {
    return ruleStatsService.getRuleStats(ruleId);
  }

  async getOverallStats(): Promise<OverallUsageStats> {
    return ruleStatsService.getOverallStats();
  }

  async getRuleUsageHistory(ruleId: string, limit?: number): Promise<RuleUsageRecord[]> {
    return ruleStatsService.getRuleUsageHistory(ruleId, limit);
  }

  async getRuleTypeStats(): Promise<RuleTypeStats> {
    return ruleStatsService.getRuleTypeStats();
  }

  async getRecommendedRuleType(basedOnUsage: boolean = true): Promise<ExceptionRuleType> {
    return ruleStatsService.getRecommendedRuleType(basedOnUsage);
  }

  // ==================== Import/Export Methods ====================

  async importRules(
    rules: Array<Pick<ExceptionRule, 'name' | 'type' | 'description'>>,
    options: { skipDuplicates?: boolean; updateExisting?: boolean } = {}
  ): Promise<ImportResult> {
    return ruleExportImportService.importRules(rules, options);
  }

  async exportRules(includeUsageData: boolean = false): Promise<ExportResult> {
    return ruleExportImportService.exportRules(includeUsageData);
  }

  // ==================== Maintenance Methods ====================

  async updateRule(
    id: string,
    updates: Partial<Pick<ExceptionRule, 'name' | 'type' | 'description'>>
  ): Promise<{ rule: ExceptionRule; warnings: string[] }> {
    return ruleMaintenanceService.updateRule(id, updates);
  }

  async deleteRule(id: string): Promise<void> {
    return ruleMaintenanceService.deleteRule(id);
  }

  async cleanupData(options: { removeExpiredRecords?: boolean; retentionDays?: number } = {}): Promise<CleanupResult> {
    return ruleMaintenanceService.cleanupData(options);
  }

  async getSystemHealth(): Promise<SystemHealthStatus> {
    return ruleMaintenanceService.getSystemHealth();
  }
}

export const exceptionRuleManager = new ExceptionRuleManager();
