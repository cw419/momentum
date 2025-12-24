import { useState } from 'react';
import { ExceptionRuleType, EnhancedExceptionRuleException } from '../../../types';
import type { ExceptionRule, PauseOptions, SessionContext } from '../../../types';
import { exceptionRuleManager } from '../../../services/ExceptionRuleManager';
import { userFeedbackHandler } from '../../../services/UserFeedbackHandler';
import { errorRecoveryManager } from '../../../services/ErrorRecoveryManager';
import { logger } from '../../../utils/logger';
import { isDev } from '../../../utils/env';
import { useI18n } from '../../../i18n';

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
  const { tr } = useI18n();
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
    userFeedbackHandler.showInfo(
      tr('操作已取消', 'Cancelled'),
      tr('您可以继续任务或重新选择操作', 'You can continue the task or choose another action.')
    );
  };

  const handleRuleError = async (error: unknown, operation: string, context: any) => {
    try {
      if (error instanceof EnhancedExceptionRuleException) {
        const messageId = userFeedbackHandler.showErrorMessage(error, context);
        const recoveryResult = await errorRecoveryManager.attemptRecovery(error, context, operation);

        if (recoveryResult.success) {
          userFeedbackHandler.removeMessage(messageId);
          userFeedbackHandler.showSuccess(tr('问题已解决', 'Issue resolved'), recoveryResult.message);

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
        error instanceof Error ? error.message : tr('未知错误', 'Unknown error'),
        context,
        true,
        [tr('重试操作', 'Retry'), tr('刷新页面', 'Refresh')],
        'medium',
        tr('操作失败，请重试', 'Operation failed. Please try again.')
      );

      userFeedbackHandler.showErrorMessage(enhancedError, context);
    } catch (handlingError) {
      const err = handlingError instanceof Error ? handlingError : new Error(String(handlingError));
      logger.error('FOCUS_MODE', '错误处理失败', { operation, context }, err);
      userFeedbackHandler.showWarning(
        tr('系统错误', 'System error'),
        tr('处理错误时发生问题，请刷新页面重试', 'Something went wrong while handling the error. Refresh the page and try again.')
      );
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
          new EnhancedExceptionRuleException('RULE_NOT_FOUND' as any, tr('规则对象无效', 'Invalid rule'), { rule, pendingActionType })
        );
        return;
      }

      userFeedbackHandler.showProgress(
        pendingActionType === 'pause' ? tr('正在暂停任务...', 'Pausing task...') : tr('正在完成任务...', 'Completing task...')
      );

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

      const successMessage = pendingActionType === 'pause'
        ? tr(`已使用规则 "${rule.name}" 暂停任务`, `Applied rule "${rule.name}" to pause the task`)
        : tr(`已使用规则 "${rule.name}" 提前完成任务`, `Applied rule "${rule.name}" to complete the task early`);
      userFeedbackHandler.showSuccess(tr('操作成功', 'Success'), successMessage);

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
          new EnhancedExceptionRuleException('VALIDATION_ERROR' as any, tr('规则名称不能为空', 'Rule name cannot be empty'), { name, type })
        );
        return;
      }

      let validType = type;
      if (!validType || !Object.values(ExceptionRuleType).includes(validType)) {
        logger.warn('FOCUS_MODE', 'Invalid rule type, using default type', { type: validType });
        validType = pendingActionType === 'pause' ? ExceptionRuleType.PAUSE_ONLY : ExceptionRuleType.EARLY_COMPLETION_ONLY;
      }

      userFeedbackHandler.showProgress(tr('正在创建规则...', 'Creating rule...'), 0);
      userFeedbackHandler.updateProgress(30, tr('验证规则信息...', 'Validating...'));

      const duplicateCheck = await exceptionRuleManager.checkRuleNameRealTime(name);
      let userChoice: 'use_existing' | 'modify_name' | 'create_anyway' | undefined;

      if (duplicateCheck.hasConflict) {
        userFeedbackHandler.hideProgress();
        if (duplicateCheck.suggestions && duplicateCheck.suggestions.length > 0) {
          userChoice = duplicateCheck.suggestions[0].type as any;
        }
        userFeedbackHandler.showProgress(tr('正在创建规则...', 'Creating rule...'), 50);
      }

      userFeedbackHandler.updateProgress(70, tr('保存规则...', 'Saving...'));
      const result = await exceptionRuleManager.createRule(name, validType, undefined, userChoice);

      userFeedbackHandler.hideProgress();
      userFeedbackHandler.showSuccess(
        tr('规则创建成功', 'Rule created'),
        tr(`规则 "${result.rule.name}" 已创建并应用`, `Rule "${result.rule.name}" has been created and applied`)
      );

      if (result.warnings && result.warnings.length > 0) {
        userFeedbackHandler.showWarning(tr('注意事项', 'Notes'), result.warnings.join('\n'));
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
