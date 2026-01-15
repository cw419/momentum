/**
 * 错误恢复管理器
 * 提供智能的错误恢复策略和用户友好的错误处理
 */

import { ExceptionRuleError, ExceptionRuleException } from '../types';
import { ruleStateManager } from './RuleStateManager';
import { dataIntegrityChecker } from './DataIntegrityChecker';
import { enhancedDuplicationHandler } from './EnhancedDuplicationHandler';
import { logger } from '../utils/logger';
import { tr } from '../utils/runtimeI18n';

export interface RecoveryStrategy {
  errorType: ExceptionRuleError;
  strategy: 'auto_fix' | 'user_choice' | 'fallback' | 'reset';
  priority: number;
  handler: (error: ExceptionRuleException, context: RecoveryContext) => Promise<RecoveryResult>;
}

export interface RecoveryResult {
  success: boolean;
  message: string;
  actions?: RecoveryAction[];
  recoveredData?: unknown;
  requiresUserAction?: boolean;
}

export interface RecoveryAction {
  id: string;
  label: string;
  description: string;
  type: 'primary' | 'secondary' | 'danger';
  handler: () => Promise<RecoveryResult>;
}

export interface RecoveryContext {
  errorType: ExceptionRuleError;
  originalOperation: string;
  operationData: unknown;
  timestamp: Date;
  retryCount: number;
}

export class ErrorRecoveryManager {
  private strategies = new Map<ExceptionRuleError, RecoveryStrategy[]>();
  private recoveryHistory: Array<{
    error: ExceptionRuleException;
    context: RecoveryContext;
    result: RecoveryResult;
    timestamp: Date;
  }> = [];

  constructor() {
    this.initializeDefaultStrategies();
  }

  /**
   * 注册恢复策略
   */
  registerRecoveryStrategy(strategy: RecoveryStrategy): void {
    if (!this.strategies.has(strategy.errorType)) {
      this.strategies.set(strategy.errorType, []);
    }
    
    const strategies = this.strategies.get(strategy.errorType)!;
    strategies.push(strategy);
    
    // 按优先级排序
    strategies.sort((a, b) => b.priority - a.priority);
  }

  /**
   * 尝试错误恢复
   */
  async attemptRecovery(
    error: ExceptionRuleException, 
    context: unknown,
    originalOperation?: string
  ): Promise<RecoveryResult> {
    const recoveryContext: RecoveryContext = {
      errorType: error.type,
      originalOperation: originalOperation || 'unknown',
      operationData: context,
      timestamp: new Date(),
      retryCount: 0
    };

    logger.info('ERROR_RECOVERY', '开始错误恢复', { error: error.message, type: error.type, context });

    try {
      const strategies = this.strategies.get(error.type) || [];
      
      if (strategies.length === 0) {
        return this.handleUnknownError(error, recoveryContext);
      }

      // 尝试每个策略
      for (const strategy of strategies) {
        try {
          const result = await strategy.handler(error, recoveryContext);
          
          // 记录恢复历史
          this.recoveryHistory.push({
            error,
            context: recoveryContext,
            result,
            timestamp: new Date()
          });

          if (result.success) {
            logger.info('ERROR_RECOVERY', '错误恢复成功', { message: result.message });
            return result;
          }

          // 如果需要用户操作，返回结果
          if (result.requiresUserAction) {
            return result;
          }

        } catch (strategyError) {
          const err = strategyError instanceof Error ? strategyError : new Error(String(strategyError));
          logger.error('ERROR_RECOVERY', '恢复策略执行失败', undefined, err);
          continue;
        }
      }

      // 所有策略都失败了
      return this.handleRecoveryFailure(error, recoveryContext);

    } catch (recoveryError) {
      const err = recoveryError instanceof Error ? recoveryError : new Error(String(recoveryError));
      logger.error('ERROR_RECOVERY', '错误恢复过程失败', undefined, err);
      return {
        success: false,
        message: tr('错误恢复过程失败', 'Error recovery failed'),
        actions: [{
          id: 'manual_intervention',
          label: tr('手动处理', 'Manual fix'),
          description: tr('需要手动解决此问题', 'This requires manual intervention'),
          type: 'danger',
          handler: async () => ({ success: false, message: tr('需要手动处理', 'Manual intervention required') })
        }]
      };
    }
  }

  /**
   * 提供用户选择的恢复选项
   */
  getRecoveryOptions(error: ExceptionRuleException): RecoveryAction[] {
    const actions: RecoveryAction[] = [];

    switch (error.type) {
      case ExceptionRuleError.RULE_NOT_FOUND:
        actions.push(
          {
            id: 'create_new_rule',
            label: tr('创建新规则', 'Create new rule'),
            description: tr('创建一个新的规则来替代缺失的规则', 'Create a new rule to replace the missing one'),
            type: 'primary',
            handler: async () => this.handleCreateNewRule(error)
          },
          {
            id: 'select_existing_rule',
            label: tr('选择现有规则', 'Select existing rule'),
            description: tr('从现有规则中选择一个', 'Choose one from existing rules'),
            type: 'secondary',
            handler: async () => this.handleSelectExistingRule(error)
          }
        );
        break;

      case ExceptionRuleError.DUPLICATE_RULE_NAME:
        actions.push(
          {
            id: 'use_existing_rule',
            label: tr('使用现有规则', 'Use existing rule'),
            description: tr('使用已存在的同名规则', 'Use the existing rule with the same name'),
            type: 'primary',
            handler: async () => this.handleUseExistingRule(error)
          },
          {
            id: 'rename_rule',
            label: tr('重命名规则', 'Rename rule'),
            description: tr('为新规则生成一个不同的名称', 'Generate a different name for the new rule'),
            type: 'secondary',
            handler: async () => this.handleRenameRule(error)
          }
        );
        break;

      case ExceptionRuleError.RULE_TYPE_MISMATCH:
        actions.push(
          {
            id: 'create_correct_type',
            label: tr('创建正确类型的规则', 'Create correct type'),
            description: tr('创建一个类型匹配的新规则', 'Create a new rule with a matching type'),
            type: 'primary',
            handler: async () => this.handleCreateCorrectType(error)
          },
          {
            id: 'select_matching_rule',
            label: tr('选择匹配的规则', 'Select matching rule'),
            description: tr('选择一个类型匹配的现有规则', 'Select an existing rule with a matching type'),
            type: 'secondary',
            handler: async () => this.handleSelectMatchingRule(error)
          }
        );
        break;

      case ExceptionRuleError.STORAGE_ERROR:
        actions.push(
          {
            id: 'retry_operation',
            label: tr('重试操作', 'Retry'),
            description: tr('重新尝试执行操作', 'Try the operation again'),
            type: 'primary',
            handler: async () => this.handleRetryOperation(error)
          },
          {
            id: 'check_data_integrity',
            label: tr('检查数据完整性', 'Check data integrity'),
            description: tr('运行数据完整性检查和修复', 'Run a data integrity check and auto-fix if possible'),
            type: 'secondary',
            handler: async () => this.handleDataIntegrityCheck(error)
          }
        );
        break;

      default:
        actions.push({
          id: 'generic_recovery',
          label: tr('尝试通用恢复', 'Try generic recovery'),
          description: tr('执行通用的错误恢复流程', 'Run a generic recovery flow'),
          type: 'secondary',
          handler: async () => this.handleGenericRecovery(error)
        });
    }

    return actions;
  }

  /**
   * 初始化默认恢复策略
   */
  private initializeDefaultStrategies(): void {
    // 规则不存在的恢复策略
    this.registerRecoveryStrategy({
      errorType: ExceptionRuleError.RULE_NOT_FOUND,
      strategy: 'auto_fix',
      priority: 100,
      handler: async (error) => {
        // 尝试从临时规则中恢复
        const ruleId = this.extractRuleIdFromError(error);
        if (ruleId?.startsWith('temp_')) {
          try {
            const rule = await ruleStateManager.waitForRuleCreation(ruleId);
            return {
              success: true,
              message: tr('从临时规则恢复成功', 'Recovered from temporary rule'),
              recoveredData: rule
            };
          } catch {
            // 继续其他策略
          }
        }

        return {
          success: false,
          message: tr('无法自动恢复缺失的规则', 'Unable to auto-recover the missing rule'),
          requiresUserAction: true,
          actions: this.getRecoveryOptions(error)
        };
      }
    });

    // 重复规则名称的恢复策略
    this.registerRecoveryStrategy({
      errorType: ExceptionRuleError.DUPLICATE_RULE_NAME,
      strategy: 'user_choice',
      priority: 100,
      handler: async (error) => {
        return {
          success: false,
          message: tr('发现重复的规则名称', 'Duplicate rule name detected'),
          requiresUserAction: true,
          actions: this.getRecoveryOptions(error)
        };
      }
    });

    // 规则类型不匹配的恢复策略
    this.registerRecoveryStrategy({
      errorType: ExceptionRuleError.RULE_TYPE_MISMATCH,
      strategy: 'user_choice',
      priority: 100,
      handler: async (error) => {
        return {
          success: false,
          message: tr('规则类型与操作不匹配', 'Rule type does not match the action'),
          requiresUserAction: true,
          actions: this.getRecoveryOptions(error)
        };
      }
    });

    // 存储错误的恢复策略
    this.registerRecoveryStrategy({
      errorType: ExceptionRuleError.STORAGE_ERROR,
      strategy: 'auto_fix',
      priority: 100,
      handler: async (error) => {
        // 尝试数据完整性检查
        try {
          const report = await dataIntegrityChecker.checkRuleDataIntegrity();
          const autoFixableIssues = report.issues.filter(issue => issue.autoFixable);
          
          if (autoFixableIssues.length > 0) {
            const fixResults = await dataIntegrityChecker.autoFixIssues(autoFixableIssues);
            const successCount = fixResults.filter(r => r.success).length;
            
            if (successCount > 0) {
              return {
                success: true,
                message: tr(`已自动修复 ${successCount} 个数据问题`, `Auto-fixed ${successCount} data issue(s)`)
              };
            }
          }
        } catch {
          // 继续其他策略
        }

        return {
          success: false,
          message: tr('存储错误需要手动处理', 'Storage error requires manual handling'),
          requiresUserAction: true,
          actions: this.getRecoveryOptions(error)
        };
      }
    });

    // 验证错误的恢复策略
    this.registerRecoveryStrategy({
      errorType: ExceptionRuleError.VALIDATION_ERROR,
      strategy: 'auto_fix',
      priority: 100,
      handler: async (error) => {
        return {
          success: false,
          message: tr('验证错误需要用户确认', 'Validation requires your confirmation'),
          requiresUserAction: true,
          actions: [{
            id: 'fix_validation',
            label: tr('修复验证问题', 'Fix validation issues'),
            description: tr('尝试修复数据验证问题', 'Try to fix validation issues'),
            type: 'primary',
            handler: async () => this.handleValidationFix(error)
          }]
        };
      }
    });
  }

  /**
   * 处理未知错误
   */
  private async handleUnknownError(
    error: ExceptionRuleException, 
    context: RecoveryContext
  ): Promise<RecoveryResult> {
    void context;
    return {
      success: false,
      message: tr(`未知错误类型: ${error.type}`, `Unknown error type: ${error.type}`),
      actions: [{
        id: 'generic_recovery',
        label: tr('通用恢复', 'Generic recovery'),
        description: tr('尝试通用的错误恢复方法', 'Try generic recovery actions'),
        type: 'secondary',
        handler: async () => this.handleGenericRecovery(error)
      }]
    };
  }

  /**
   * 处理恢复失败
   */
  private async handleRecoveryFailure(
    error: ExceptionRuleException, 
    context: RecoveryContext
  ): Promise<RecoveryResult> {
    void context;
    return {
      success: false,
      message: tr('所有自动恢复策略都失败了', 'All auto-recovery strategies failed'),
      actions: [
        {
          id: 'manual_intervention',
          label: tr('手动处理', 'Manual fix'),
          description: tr('需要手动解决此问题', 'This requires manual intervention'),
          type: 'danger',
          handler: async () => ({ success: false, message: tr('需要手动处理', 'Manual intervention required') })
        },
        {
          id: 'reset_system',
          label: tr('重置系统', 'Reset system'),
          description: tr('重置规则系统到初始状态', 'Reset the rule system to the initial state'),
          type: 'danger',
          handler: async () => this.handleSystemReset(error)
        }
      ]
    };
  }

  /**
   * 恢复操作处理器
   */
  private async handleCreateNewRule(error: ExceptionRuleException): Promise<RecoveryResult> {
    void error;
    // 这里应该触发创建新规则的UI流程
    return {
      success: false,
      message: tr('请创建新规则', 'Please create a new rule'),
      requiresUserAction: true
    };
  }

  private async handleSelectExistingRule(error: ExceptionRuleException): Promise<RecoveryResult> {
    void error;
    // 这里应该显示现有规则选择界面
    return {
      success: false,
      message: tr('请选择现有规则', 'Please select an existing rule'),
      requiresUserAction: true
    };
  }

  private async handleUseExistingRule(error: ExceptionRuleException): Promise<RecoveryResult> {
    try {
      const existingRules =
        error.details && typeof error.details === 'object'
          ? (error.details as { existingRules?: unknown }).existingRules
          : undefined;

      const rules = Array.isArray(existingRules) ? existingRules : [];
      if (rules.length > 0) {
        return {
          success: true,
          message: tr('使用现有规则', 'Using existing rule'),
          recoveredData: rules[0]
        };
      }
    } catch {
      // 继续
    }

    return {
      success: false,
      message: tr('无法找到可用的现有规则', 'No usable existing rule found')
    };
  }

  private async handleRenameRule(error: ExceptionRuleException): Promise<RecoveryResult> {
    try {
      const ruleName = this.extractRuleNameFromError(error);
      if (ruleName) {
        const suggestions = enhancedDuplicationHandler.generateNameSuggestions(
          ruleName, 
          []
        );
        
        if (suggestions.length > 0) {
          return {
            success: true,
            message: tr(`建议使用名称: ${suggestions[0]}`, `Suggested name: ${suggestions[0]}`),
            recoveredData: { suggestedName: suggestions[0] }
          };
        }
      }
    } catch {
      // 继续
    }

    return {
      success: false,
      message: tr('无法生成新的规则名称', 'Unable to generate a new rule name')
    };
  }

  private async handleCreateCorrectType(error: ExceptionRuleException): Promise<RecoveryResult> {
    void error;
    return {
      success: false,
      message: tr('请创建正确类型的规则', 'Please create a rule with the correct type'),
      requiresUserAction: true
    };
  }

  private async handleSelectMatchingRule(error: ExceptionRuleException): Promise<RecoveryResult> {
    void error;
    return {
      success: false,
      message: tr('请选择类型匹配的规则', 'Please select a rule with a matching type'),
      requiresUserAction: true
    };
  }

  private async handleRetryOperation(error: ExceptionRuleException): Promise<RecoveryResult> {
    void error;
    // 简单的重试逻辑
    return {
      success: false,
      message: tr('请重试操作', 'Please retry the operation'),
      requiresUserAction: true
    };
  }

  private async handleDataIntegrityCheck(error: ExceptionRuleException): Promise<RecoveryResult> {
    void error;
    try {
      const report = await dataIntegrityChecker.checkRuleDataIntegrity();
      
      if (report.issues.length === 0) {
        return {
          success: true,
          message: tr('数据完整性检查通过', 'Data integrity check passed')
        };
      }

      const autoFixableCount = report.issues.filter(i => i.autoFixable).length;
      return {
        success: false,
        message: tr(
          `发现 ${report.issues.length} 个问题，其中 ${autoFixableCount} 个可自动修复`,
          `Found ${report.issues.length} issue(s), ${autoFixableCount} can be auto-fixed`
        ),
        actions: [{
          id: 'auto_fix_issues',
          label: tr('自动修复', 'Auto-fix'),
          description: tr('自动修复可修复的问题', 'Automatically fix the fixable issues'),
          type: 'primary',
          handler: async () => {
            const fixResults = await dataIntegrityChecker.autoFixIssues(
              report.issues.filter(i => i.autoFixable)
            );
            const successCount = fixResults.filter(r => r.success).length;
            return {
              success: successCount > 0,
              message: tr(`已修复 ${successCount} 个问题`, `Fixed ${successCount} issue(s)`)
            };
          }
        }]
      };

    } catch {
      return {
        success: false,
        message: tr('数据完整性检查失败', 'Data integrity check failed')
      };
    }
  }

  private async handleGenericRecovery(error: ExceptionRuleException): Promise<RecoveryResult> {
    void error;
    // 通用恢复逻辑
    try {
      // 尝试同步规则状态
      await ruleStateManager.syncRuleStates();
      
      return {
        success: true,
        message: tr('已同步规则状态', 'Rule state synced')
      };
    } catch {
      return {
        success: false,
        message: tr('通用恢复失败', 'Generic recovery failed')
      };
    }
  }

  private async handleValidationFix(error: ExceptionRuleException): Promise<RecoveryResult> {
    void error;
    return {
      success: false,
      message: tr('验证修复需要用户输入', 'Fixing validation requires your input'),
      requiresUserAction: true
    };
  }

  private async handleSystemReset(error: ExceptionRuleException): Promise<RecoveryResult> {
    void error;
    return {
      success: false,
      message: tr('系统重置是危险操作，需要用户确认', 'System reset is risky and requires confirmation'),
      requiresUserAction: true
    };
  }

  /**
   * 辅助方法
   */
  private extractRuleIdFromError(error: ExceptionRuleException): string | null {
    const message = error.message;
    const match = message.match(/(?:规则 ID|Rule ID)\s+([\w-]+)/i);
    return match?.[1] ?? null;
  }

  private extractRuleNameFromError(error: ExceptionRuleException): string | null {
    const message = error.message;
    const match = message.match(/(?:规则名称|Rule name)\s+"([^"]+)"/i);
    return match?.[1] ?? null;
  }

  /**
   * 获取恢复历史
   */
  getRecoveryHistory(): typeof this.recoveryHistory {
    return [...this.recoveryHistory];
  }

  /**
   * 清除恢复历史
   */
  clearRecoveryHistory(): void {
    this.recoveryHistory = [];
  }
}

// 创建全局实例
export const errorRecoveryManager = new ErrorRecoveryManager();
