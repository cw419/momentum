import { useCallback, useState } from 'react';
import type { ExceptionRule } from '../../../types';
import { ExceptionRuleType } from '../../../types';
import type { RuleManagerFormData } from '../types';

export function useRuleManagerForm() {
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

  const resetForm = useCallback(() => {
    setFormData({
      name: '',
      type: ExceptionRuleType.PAUSE_ONLY,
      description: '',
    });
    setFormErrors([]);
    setFormWarnings([]);
    setDuplicateSuggestions([]);
  }, []);

  const beginEditRule = useCallback((rule: ExceptionRule) => {
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

  return {
    editingRule,
    setEditingRule,
    showCreateForm,
    setShowCreateForm,
    formData,
    setFormData,
    formErrors,
    setFormErrors,
    formWarnings,
    setFormWarnings,
    duplicateSuggestions,
    setDuplicateSuggestions,
    resetForm,
    beginEditRule,
  };
}

