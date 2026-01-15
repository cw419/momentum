/**
 * 例外规则管理界面组件（Container）
 * 提供规则的创建、编辑、删除和分类管理功能
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ExceptionRule, ExceptionRuleError, ExceptionRuleException, ExceptionRuleType } from '../../types';
import { exceptionRuleManager } from '../../services/ExceptionRuleManager';
import { asyncOperationManager } from '../../utils/AsyncOperationManager';
import { useI18n } from '../../i18n';
import { getSafeErrorDetail, getSafeErrorDetailFromUnknown } from '../../utils/errorMessage';
import { RuleManagerViewView } from './RuleManagerViewView';

interface RuleManagerViewProps {
  onClose: () => void;
  initialFilter?: ExceptionRuleType;
  onRuleSelected?: (rule: ExceptionRule) => void;
}

type SortBy = 'name' | 'usage' | 'created' | 'lastUsed';

interface RuleManagerFormData {
  name: string;
  type: ExceptionRuleType;
  description: string;
}

export function RuleManagerView({ onClose, initialFilter, onRuleSelected }: RuleManagerViewProps) {
  const { language, tr } = useI18n();
  const [rules, setRules] = useState<ExceptionRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmationRule, setDeleteConfirmationRule] = useState<ExceptionRule | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<ExceptionRuleType | 'all'>(initialFilter || 'all');
  const [sortBy, setSortBy] = useState<SortBy>('usage');

  const [editingRule, setEditingRule] = useState<ExceptionRule | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [formData, setFormData] = useState<RuleManagerFormData>({
    name: '',
    type: ExceptionRuleType.PAUSE_ONLY,
    description: '',
  });
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [formWarnings, setFormWarnings] = useState<string[]>([]);
  const [duplicateSuggestions, setDuplicateSuggestions] = useState<string[]>([]);

  const [savingOperations, setSavingOperations] = useState<Set<string>>(new Set());
  const [optimisticUpdates, setOptimisticUpdates] = useState<Map<string, ExceptionRule>>(new Map());

  const loadRules = useCallback(async () => {
    try {
      setLoading(true);
      const allRules = await exceptionRuleManager.getAllRules();
      setRules(allRules);
      setError(null);
    } catch (err) {
      const safe = getSafeErrorDetailFromUnknown(err, language);
      setError(safe ?? tr('加载规则失败', 'Failed to load rules'));
    } finally {
      setLoading(false);
    }
  }, [language, tr]);

  useEffect(() => {
    void loadRules();
  }, [loadRules]);

  const filteredRules = useMemo(() => {
    let filtered = rules.filter(rule => rule.isActive);

    if (typeFilter !== 'all') {
      filtered = filtered.filter(rule => rule.type === typeFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(rule => rule.name.toLowerCase().includes(query) || rule.description?.toLowerCase().includes(query));
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'usage':
          return b.usageCount - a.usageCount;
        case 'lastUsed':
          if (a.lastUsedAt && b.lastUsedAt) {
            return b.lastUsedAt.getTime() - a.lastUsedAt.getTime();
          }
          if (a.lastUsedAt && !b.lastUsedAt) return -1;
          if (!a.lastUsedAt && b.lastUsedAt) return 1;
          return 0;
        default:
          return 0;
      }
    });

    return filtered;
  }, [rules, searchQuery, typeFilter, sortBy]);

  const resetForm = () => {
    setFormData({
      name: '',
      type: ExceptionRuleType.PAUSE_ONLY,
      description: '',
    });
    setFormErrors([]);
    setFormWarnings([]);
    setDuplicateSuggestions([]);
  };

  const handleCreateRule = async () => {
    const operationId = `create-rule-${Date.now()}`;

    try {
      setFormErrors([]);
      setFormWarnings([]);
      setSavingOperations(prev => new Set(prev).add(operationId));

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

      setOptimisticUpdates(prev => new Map(prev).set(operationId, tempRule));
      setRules(prev => [...prev, tempRule]);

      await asyncOperationManager.executeOperation({
        id: operationId,
        operation: () => exceptionRuleManager.createRule(formData.name, formData.type, formData.description || undefined),
        timeout: 3000,
        retryCount: 2,
        onSuccess: (result) => {
          setRules(prev => prev.map(rule => (rule.id === operationId ? result.rule : rule)));
          setOptimisticUpdates(prev => {
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
          setRules(prev => prev.filter(rule => rule.id !== operationId));
          setOptimisticUpdates(prev => {
            const newMap = new Map(prev);
            newMap.delete(operationId);
            return newMap;
          });

          if (error instanceof ExceptionRuleException) {
            const safe = getSafeErrorDetail(error.message, language);
            setFormErrors([safe ?? tr('创建规则失败，请重试', 'Failed to create rule. Please try again.')]);

            if (error.type === ExceptionRuleError.DUPLICATE_RULE_NAME) {
              exceptionRuleManager.getDuplicationSuggestions(formData.name).then(suggestions => {
                setDuplicateSuggestions(suggestions.nameSuggestions);
              });
            }
          } else {
            setFormErrors([tr('创建规则失败，请重试', 'Failed to create rule. Please try again.')]);
          }
        },
      });
    } catch {
      setRules(prev => prev.filter(rule => rule.id !== operationId));
      setOptimisticUpdates(prev => {
        const newMap = new Map(prev);
        newMap.delete(operationId);
        return newMap;
      });
      setFormErrors([tr('创建规则失败', 'Failed to create rule')]);
    } finally {
      setSavingOperations(prev => {
        const newSet = new Set(prev);
        newSet.delete(operationId);
        return newSet;
      });
    }
  };

  const handleUpdateRule = async () => {
    if (!editingRule) return;

    const operationId = `update-rule-${editingRule.id}-${Date.now()}`;
    const originalRule = editingRule;

    try {
      setFormErrors([]);
      setFormWarnings([]);
      setSavingOperations(prev => new Set(prev).add(operationId));

      const updatedRule: ExceptionRule = {
        ...originalRule,
        name: formData.name,
        type: formData.type,
        description: formData.description || undefined,
      };

      setRules(prev => prev.map(rule => (rule.id === originalRule.id ? updatedRule : rule)));

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
          setRules(prev => prev.map(rule => (rule.id === originalRule.id ? originalRule : rule)));

          if (error instanceof ExceptionRuleException) {
            const safe = getSafeErrorDetail(error.message, language);
            setFormErrors([safe ?? tr('更新规则失败，请重试', 'Failed to update rule. Please try again.')]);
          } else {
            setFormErrors([tr('更新规则失败，请重试', 'Failed to update rule. Please try again.')]);
          }
        },
      });
    } catch {
      setRules(prev => prev.map(rule => (rule.id === originalRule.id ? originalRule : rule)));
      setFormErrors([tr('更新规则失败', 'Failed to update rule')]);
    } finally {
      setSavingOperations(prev => {
        const newSet = new Set(prev);
        newSet.delete(operationId);
        return newSet;
      });
    }
  };

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
  }, [deleteConfirmationRule, loadRules, tr, language]);

  const handleEditRule = useCallback((rule: ExceptionRule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      type: rule.type,
      description: rule.description || '',
    });
    setFormErrors([]);
    setFormWarnings([]);
    setDuplicateSuggestions([]);
  }, []);

  const handleExportRules = async () => {
    try {
      const exportData = await exceptionRuleManager.exportRules(true);
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `exception-rules-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setError(tr('导出规则失败', 'Failed to export rules'));
    }
  };

  return (
    <RuleManagerViewView
      onClose={onClose}
      onRuleSelected={onRuleSelected}
      tr={tr}
      loading={loading}
      error={error}
      setError={setError}
      deleteConfirmationRule={deleteConfirmationRule}
      setDeleteConfirmationRule={setDeleteConfirmationRule}
      confirmDeleteRule={confirmDeleteRule}
      handleExportRules={handleExportRules}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      typeFilter={typeFilter}
      setTypeFilter={setTypeFilter}
      sortBy={sortBy}
      setSortBy={setSortBy}
      filteredRules={filteredRules}
      optimisticUpdates={optimisticUpdates}
      handleEditRule={handleEditRule}
      handleDeleteRule={handleDeleteRule}
      showCreateForm={showCreateForm}
      setShowCreateForm={setShowCreateForm}
      editingRule={editingRule}
      setEditingRule={setEditingRule}
      resetForm={resetForm}
      formData={formData}
      setFormData={setFormData}
      formErrors={formErrors}
      formWarnings={formWarnings}
      duplicateSuggestions={duplicateSuggestions}
      handleCreateRule={handleCreateRule}
      handleUpdateRule={handleUpdateRule}
      savingOperations={savingOperations}
    />
  );
}
