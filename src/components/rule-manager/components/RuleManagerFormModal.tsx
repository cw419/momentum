import { AlertTriangle, Loader2 } from 'lucide-react';
import type React from 'react';
import type { ExceptionRule } from '../../../types';
import { ExceptionRuleType } from '../../../types';
import type { RuleManagerFormData } from '../types';

interface RuleManagerFormModalProps {
  isOpen: boolean;
  editingRule: ExceptionRule | null;
  tr: (zh: string, en: string) => string;

  formErrors: string[];
  formWarnings: string[];
  duplicateSuggestions: string[];

  formData: RuleManagerFormData;
  setFormData: React.Dispatch<React.SetStateAction<RuleManagerFormData>>;

  setShowCreateForm: React.Dispatch<React.SetStateAction<boolean>>;
  setEditingRule: React.Dispatch<React.SetStateAction<ExceptionRule | null>>;
  resetForm: () => void;

  handleCreateRule: () => Promise<void>;
  handleUpdateRule: () => Promise<void>;
  savingOperations: Set<string>;
}

export function RuleManagerFormModal({
  isOpen,
  editingRule,
  tr,
  formErrors,
  formWarnings,
  duplicateSuggestions,
  formData,
  setFormData,
  setShowCreateForm,
  setEditingRule,
  resetForm,
  handleCreateRule,
  handleUpdateRule,
  savingOperations,
}: RuleManagerFormModalProps) {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-md p-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
          {editingRule ? tr('编辑规则', 'Edit rule') : tr('创建新规则', 'Create rule')}
        </h3>

        {formErrors.length > 0 && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-2xl">
            {formErrors.map((formError, index) => (
              <div key={index} className="flex items-center space-x-2 text-red-700 dark:text-red-300">
                <AlertTriangle size={16} />
                <span>{formError}</span>
              </div>
            ))}
          </div>
        )}

        {formWarnings.length > 0 && (
          <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/30 rounded-2xl">
            {formWarnings.map((warning, index) => (
              <div key={index} className="flex items-center space-x-2 text-yellow-700 dark:text-yellow-300">
                <AlertTriangle size={16} />
                <span>{warning}</span>
              </div>
            ))}
          </div>
        )}

        {duplicateSuggestions.length > 0 && (
          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-2xl">
            <p className="text-blue-700 dark:text-blue-300 mb-2">{tr('建议的规则名称：', 'Suggested rule names:')}</p>
            <div className="flex flex-wrap gap-2">
              {duplicateSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => setFormData({ ...formData, name: suggestion })}
                  className="px-3 py-1 rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-500/30 transition-colors text-sm"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {tr('规则名称 *', 'Rule name *')}
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(event) => setFormData({ ...formData, name: event.target.value })}
              placeholder={tr('例如：上厕所、喝水、接电话', 'e.g. bathroom break, water, phone call')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {tr('规则类型 *', 'Rule type *')}
            </label>
            <select
              value={formData.type}
              onChange={(event) => setFormData({ ...formData, type: event.target.value as ExceptionRuleType })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value={ExceptionRuleType.PAUSE_ONLY}>
                {tr('仅暂停 - 只能用于暂停计时', 'Pause only — can only pause the timer')}
              </option>
              <option value={ExceptionRuleType.EARLY_COMPLETION_ONLY}>
                {tr('仅提前完成 - 只能用于提前完成任务', 'Early completion only — can only complete tasks early')}
              </option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {tr('描述（可选）', 'Description (optional)')}
            </label>
            <textarea
              value={formData.description}
              onChange={(event) => setFormData({ ...formData, description: event.target.value })}
              placeholder={tr('详细描述这个例外情况...', 'Describe this exception...')}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 mt-6">
          <button
            onClick={() => {
              setShowCreateForm(false);
              setEditingRule(null);
              resetForm();
            }}
            className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
          >
            {tr('取消', 'Cancel')}
          </button>
          <button
            onClick={editingRule ? () => void handleUpdateRule() : () => void handleCreateRule()}
            disabled={!formData.name.trim() || savingOperations.size > 0}
            className="px-4 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white transition-colors flex items-center space-x-2"
          >
            {savingOperations.size > 0 && <Loader2 size={16} className="animate-spin" />}
            <span>{editingRule ? tr('更新', 'Update') : tr('创建', 'Create')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

