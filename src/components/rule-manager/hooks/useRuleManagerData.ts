import { useCallback, useEffect, useState } from 'react';
import type { ExceptionRule } from '../../../types';
import { exceptionRuleManager } from '../../../services/ExceptionRuleManager';
import { getSafeErrorDetailFromUnknown } from '../../../utils/errorMessage';
import type { Language } from '../../../i18n/translations';

export function useRuleManagerData(args: {
  language: Language;
  tr: (zh: string, en: string) => string;
}) {
  const { language, tr } = args;

  const [rules, setRules] = useState<ExceptionRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return {
    rules,
    setRules,
    loading,
    error,
    setError,
    loadRules,
  };
}
