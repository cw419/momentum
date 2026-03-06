import { useCallback, useState } from 'react';
import type { ExceptionRule } from '../../../types';
import { ExceptionRuleError, ExceptionRuleException } from '../../../types';
import { exceptionRuleManager } from '../../../services/ExceptionRuleManager';
import { asyncOperationManager } from '../../../utils/AsyncOperationManager';
import {
  getSafeErrorDetail,
  getSafeErrorDetailFromUnknown,
} from '../../../utils/errorMessage';
import { getPlatformCapabilityCenter } from '../../../utils/platform-capabilities/center';
import {
  removeRuleById,
  replaceRuleById,
  type UseRuleManagerActionsArgs,
} from './useRuleManagerActions.helpers';

export function useRuleManagerActions(args: UseRuleManagerActionsArgs) {
  const {
    language,
    tr,
    loadRules,
    setError,
    formData,
    editingRule,
    setEditingRule,
    setShowCreateForm,
    resetForm,
    beginEditRule,
    setRules,
    setFormErrors,
    setFormWarnings,
    setDuplicateSuggestions,
  } = args;

  const [deleteConfirmationRule, setDeleteConfirmationRule] =
    useState<ExceptionRule | null>(null);
  const [savingOperations, setSavingOperations] = useState<Set<string>>(
    new Set(),
  );
  const [optimisticUpdates, setOptimisticUpdates] = useState<
    Map<string, ExceptionRule>
  >(new Map());
  const capabilityCenter = getPlatformCapabilityCenter();

  const handleCreateRule = useCallback(async () => {
    const operationId = `create-rule-${Date.now()}`;

    try {
      setFormErrors([]);
      setFormWarnings([]);
      setSavingOperations((prev) => new Set(prev).add(operationId));

      const tempRule: ExceptionRule = {
        id: operationId,
        name: formData.name,
        type: formData.type,
        description: formData.description || undefined,
        scope: 'chain',
        isActive: true,
        usageCount: 0,
        createdAt: new Date(),
      };

      setOptimisticUpdates((prev) => new Map(prev).set(operationId, tempRule));
      setRules((prev) => [...prev, tempRule]);

      await asyncOperationManager.executeOperation({
        id: operationId,
        operation: () =>
          exceptionRuleManager.createRule(
            formData.name,
            formData.type,
            formData.description || undefined,
          ),
        timeout: 3000,
        retryCount: 2,
        onSuccess: (result) => {
          setRules((prev) => replaceRuleById(prev, operationId, result.rule));
          setOptimisticUpdates((prev) => {
            const newMap = new Map(prev);
            newMap.delete(operationId);
            return newMap;
          });

          if (result.warnings.length === 0) {
            setShowCreateForm(false);
            resetForm();
          } else {
            setFormWarnings(result.warnings);
          }
        },
        onError: (error) => {
          setRules((prev) => removeRuleById(prev, operationId));
          setOptimisticUpdates((prev) => {
            const newMap = new Map(prev);
            newMap.delete(operationId);
            return newMap;
          });

          if (error instanceof ExceptionRuleException) {
            const safe = getSafeErrorDetail(error.message, language);
            setFormErrors([
              safe ??
                tr(
                  '创建规则失败，请重试',
                  'Failed to create rule. Please try again.',
                ),
            ]);

            if (error.type === ExceptionRuleError.DUPLICATE_RULE_NAME) {
              exceptionRuleManager
                .getDuplicationSuggestions(formData.name)
                .then((suggestions) => {
                  setDuplicateSuggestions(suggestions.nameSuggestions);
                });
            }
          } else {
            setFormErrors([
              tr(
                '创建规则失败，请重试',
                'Failed to create rule. Please try again.',
              ),
            ]);
          }
        },
      });
    } catch {
      setRules((prev) => prev.filter((rule) => rule.id !== operationId));
      setOptimisticUpdates((prev) => {
        const newMap = new Map(prev);
        newMap.delete(operationId);
        return newMap;
      });
      setFormErrors([tr('创建规则失败', 'Failed to create rule')]);
    } finally {
      setSavingOperations((prev) => {
        const newSet = new Set(prev);
        newSet.delete(operationId);
        return newSet;
      });
    }
  }, [
    formData.description,
    formData.name,
    formData.type,
    language,
    resetForm,
    setDuplicateSuggestions,
    setFormErrors,
    setFormWarnings,
    setRules,
    setShowCreateForm,
    tr,
  ]);

  const handleUpdateRule = useCallback(async () => {
    if (!editingRule) return;

    const operationId = `update-rule-${editingRule.id}-${Date.now()}`;
    const originalRule = editingRule;

    try {
      setFormErrors([]);
      setFormWarnings([]);
      setSavingOperations((prev) => new Set(prev).add(operationId));

      const updatedRule: ExceptionRule = {
        ...originalRule,
        name: formData.name,
        type: formData.type,
        description: formData.description || undefined,
      };

      setRules((prev) => replaceRuleById(prev, originalRule.id, updatedRule));

      await asyncOperationManager.executeOperation({
        id: operationId,
        operation: () =>
          exceptionRuleManager.updateRule(originalRule.id, {
            name: formData.name,
            type: formData.type,
            description: formData.description || undefined,
          }),
        timeout: 3000,
        retryCount: 2,
        onSuccess: (result) => {
          if (result.warnings.length === 0) {
            setEditingRule(null);
            resetForm();
          } else {
            setFormWarnings(result.warnings);
          }
        },
        onError: (error) => {
          setRules((prev) =>
            replaceRuleById(prev, originalRule.id, originalRule),
          );

          if (error instanceof ExceptionRuleException) {
            const safe = getSafeErrorDetail(error.message, language);
            setFormErrors([
              safe ??
                tr(
                  '更新规则失败，请重试',
                  'Failed to update rule. Please try again.',
                ),
            ]);
          } else {
            setFormErrors([
              tr(
                '更新规则失败，请重试',
                'Failed to update rule. Please try again.',
              ),
            ]);
          }
        },
      });
    } catch {
      setRules((prev) => replaceRuleById(prev, originalRule.id, originalRule));
      setFormErrors([tr('更新规则失败', 'Failed to update rule')]);
    } finally {
      setSavingOperations((prev) => {
        const newSet = new Set(prev);
        newSet.delete(operationId);
        return newSet;
      });
    }
  }, [
    editingRule,
    formData.description,
    formData.name,
    formData.type,
    language,
    resetForm,
    setEditingRule,
    setFormErrors,
    setFormWarnings,
    setRules,
    tr,
  ]);

  const handleDeleteRule = useCallback((rule: ExceptionRule) => {
    setDeleteConfirmationRule(rule);
  }, []);

  const confirmDeleteRule = useCallback(async () => {
    const rule = deleteConfirmationRule;
    if (!rule) return;
    setDeleteConfirmationRule(null);

    try {
      await exceptionRuleManager.deleteRule(rule.id);
      await loadRules();
    } catch (err) {
      const safe = getSafeErrorDetailFromUnknown(err, language);
      setError(safe ?? tr('删除规则失败', 'Failed to delete rule'));
    }
  }, [deleteConfirmationRule, language, loadRules, setError, tr]);

  const handleEditRule = useCallback(
    (rule: ExceptionRule) => {
      beginEditRule(rule);
    },
    [beginEditRule],
  );

  const handleExportRules = useCallback(async () => {
    try {
      const exportData = await exceptionRuleManager.exportRules(true);
      await capabilityCenter.file.saveFile(
        JSON.stringify(exportData, null, 2),
        `exception-rules-${new Date().toISOString().split('T')[0]}.json`,
      );
    } catch {
      setError(tr('导出规则失败', 'Failed to export rules'));
    }
  }, [capabilityCenter.file, setError, tr]);

  return {
    deleteConfirmationRule,
    setDeleteConfirmationRule,
    confirmDeleteRule,
    handleDeleteRule,
    handleEditRule,
    handleExportRules,
    handleCreateRule,
    handleUpdateRule,
    savingOperations,
    optimisticUpdates,
  };
}
