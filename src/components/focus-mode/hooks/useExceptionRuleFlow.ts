import { useState } from 'react';
import { ExceptionRuleType, EnhancedExceptionRuleException } from '../../../types';
import type { ExceptionRule, PauseOptions, SessionContext } from '../../../types';
import { exceptionRuleManager } from '../../../services/ExceptionRuleManager';
import { userFeedbackHandler } from '../../../services/UserFeedbackHandler';
import { errorRecoveryManager } from '../../../services/ErrorRecoveryManager';
import { logger } from '../../../utils/logger';
import { isDev } from '../../../utils/env';

type PendingActionType = 'pause' | 'early_completion';

interface UseExceptionRuleFlowParams {
  sessionContext: SessionContext;
  onPause: (duration?: number) => void;
  onRequestCompletionDialog: () => void;
  scheduleAutoResume: (minutes: number) => void;
  clearAutoResumeSchedule: () => void;
  onRuleUsed?: (rule: ExceptionRule, actionType: PendingActionType, pauseOptions?: PauseOptions) => void;
}

export function useExceptionRuleFlow({
  sessionContext,
  onPause,
  onRequestCompletionDialog,
  scheduleAutoResume,
  clearAutoResumeSchedule,
  onRuleUsed,
}: UseExceptionRuleFlowParams) {
  const [showRuleSelection, setShowRuleSelection] = useState(false);
  const [pendingActionType, setPendingActionType] = useState<PendingActionType | null>(null);

  const openPauseSelection = () => {
    setPendingActionType('pause');
    setShowRuleSelection(true);
  };

  const openEarlyCompletionSelection = () => {
    setPendingActionType('early_completion');
    setShowRuleSelection(true);
  };

  const handleRuleSelectionCancel = () => {
    userFeedbackHandler.hideProgress();
    setShowRuleSelection(false);
    setPendingActionType(null);
    userFeedbackHandler.showInfo('操作已取消', '您可以继续任务或重新选择操作');
  };

  const handleRuleError = async (error: unknown, operation: string, context: any) => {
    try {
      if (error instanceof EnhancedExceptionRuleException) {
        const messageId = userFeedbackHandler.showErrorMessage(error, context);
        const recoveryResult = await errorRecoveryManager.attemptRecovery(error, context, operation);

        if (recoveryResult.success) {
          userFeedbackHandler.removeMessage(messageId);
          userFeedbackHandler.showSuccess('问题已解决', recoveryResult.message);

          if (recoveryResult.recoveredData && operation === 'create_rule') {
            await handleRuleSelected(recoveryResult.recoveredData as any);
          }
        } else if (recoveryResult.requiresUserAction && recoveryResult.actions) {
          logger.error('FOCUS_MODE', '需要用户操作的恢复失败', { recoveryResult, operation, context });
        }
        return;
      }

      const enhancedError = new EnhancedExceptionRuleException(
        'STORAGE_ERROR' as any,
        error instanceof Error ? error.message : '未知错误',
        context,
        true,
        ['重试操作', '刷新页面'],
        'medium',
        '操作失败，请重试'
      );

      userFeedbackHandler.showErrorMessage(enhancedError, context);
    } catch (handlingError) {
      const err = handlingError instanceof Error ? handlingError : new Error(String(handlingError));
      logger.error('FOCUS_MODE', '错误处理失败', { operation, context }, err);
      userFeedbackHandler.showWarning('系统错误', '处理错误时发生问题，请刷新页面重试');
    }
  };

  const handleRuleSelected = async (rule: ExceptionRule, pauseOptions?: PauseOptions) => {
    if (isDev) {
      logger.debug('FOCUS_MODE', 'handleRuleSelected called', {
        pendingActionType,
        ruleId: rule?.id,
        ruleType: typeof rule,
        rule,
      });
    }

    if (!pendingActionType) return;

    try {
      if (!rule || !rule.id) {
        logger.error('FOCUS_MODE', 'Invalid rule object', { rule, pendingActionType });
        userFeedbackHandler.showErrorMessage(
          new EnhancedExceptionRuleException('RULE_NOT_FOUND' as any, '规则对象无效', { rule, pendingActionType })
        );
        return;
      }

      userFeedbackHandler.showProgress(`正在${pendingActionType === 'pause' ? '暂停' : '完成'}任务...`);

      if (isDev) {
        logger.debug('FOCUS_MODE', 'Preparing to use rule', {
          ruleId: rule.id,
          actionType: pendingActionType,
          sessionContext,
          pauseOptions,
        });
      }

      await exceptionRuleManager.useRule(rule.id, sessionContext, pendingActionType, pauseOptions);

      userFeedbackHandler.hideProgress();

      const actionName = pendingActionType === 'pause' ? '暂停' : '提前完成';
      userFeedbackHandler.showSuccess('操作成功', `已使用规则 "${rule.name}" ${actionName}任务`);

      onRuleUsed?.(rule, pendingActionType, pauseOptions);

      if (pendingActionType === 'pause') {
        onPause(pauseOptions?.duration);
        if (pauseOptions?.duration && pauseOptions.autoResume) {
          scheduleAutoResume(Math.floor(pauseOptions.duration / 60));
        }
      } else if (pendingActionType === 'early_completion') {
        clearAutoResumeSchedule();
        setShowRuleSelection(false);
        setPendingActionType(null);
        onRequestCompletionDialog();
        return;
      }

      setShowRuleSelection(false);
      setPendingActionType(null);
    } catch (error) {
      userFeedbackHandler.hideProgress();

      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('FOCUS_MODE', 'Failed to use rule', { ruleId: rule.id, actionType: pendingActionType }, err);

      await handleRuleError(error, 'use_rule', { rule, actionType: pendingActionType });
    }
  };

  const handleCreateNewRule = async (name: string, type: ExceptionRuleType) => {
    if (isDev) {
      logger.debug('FOCUS_MODE', 'handleCreateNewRule called', { name, type, typeOf: typeof type });
    }

    try {
      if (!name || !name.trim()) {
        userFeedbackHandler.showErrorMessage(
          new EnhancedExceptionRuleException('VALIDATION_ERROR' as any, '规则名称不能为空', { name, type })
        );
        return;
      }

      let validType = type;
      if (!validType || !Object.values(ExceptionRuleType).includes(validType)) {
        logger.warn('FOCUS_MODE', 'Invalid rule type, using default type', { type: validType });
        validType = pendingActionType === 'pause' ? ExceptionRuleType.PAUSE_ONLY : ExceptionRuleType.EARLY_COMPLETION_ONLY;
      }

      userFeedbackHandler.showProgress('正在创建规则...', 0);
      userFeedbackHandler.updateProgress(30, '验证规则信息...');

      const duplicateCheck = await exceptionRuleManager.checkRuleNameRealTime(name);
      let userChoice: 'use_existing' | 'modify_name' | 'create_anyway' | undefined;

      if (duplicateCheck.hasConflict) {
        userFeedbackHandler.hideProgress();
        if (duplicateCheck.suggestions && duplicateCheck.suggestions.length > 0) {
          userChoice = duplicateCheck.suggestions[0].type as any;
        }
        userFeedbackHandler.showProgress('正在创建规则...', 50);
      }

      userFeedbackHandler.updateProgress(70, '保存规则...');
      const result = await exceptionRuleManager.createRule(name, validType, undefined, userChoice);

      userFeedbackHandler.hideProgress();
      userFeedbackHandler.showSuccess('规则创建成功', `规则 "${result.rule.name}" 已创建并应用`);

      if (result.warnings && result.warnings.length > 0) {
        userFeedbackHandler.showWarning('注意事项', result.warnings.join('\n'));
      }

      await handleRuleSelected(result.rule);
    } catch (error) {
      userFeedbackHandler.hideProgress();

      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('FOCUS_MODE', '创建规则失败', { name, type }, err);

      await handleRuleError(error, 'create_rule', { name, type });
    }
  };

  return {
    showRuleSelection,
    pendingActionType,
    openPauseSelection,
    openEarlyCompletionSelection,
    handleRuleSelected,
    handleCreateNewRule,
    handleRuleSelectionCancel,
  };
}
