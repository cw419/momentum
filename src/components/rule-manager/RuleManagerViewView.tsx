import React from 'react';
import { AlertTriangle, Download, Filter, Loader2, Plus, Search, Settings } from 'lucide-react';
import type { ExceptionRule } from '../../types';
import { ExceptionRuleType } from '../../types';
import RuleItem from '../RuleItem';
import { ConfirmationDialog } from '../ConfirmationDialog';

type SortBy = 'name' | 'usage' | 'created' | 'lastUsed';

interface RuleManagerFormData {
  name: string;
  type: ExceptionRuleType;
  description: string;
}

interface RuleManagerViewViewProps {
  onClose: () => void;
  onRuleSelected?: (rule: ExceptionRule) => void;
  tr: (zh: string, en: string) => string;

  loading: boolean;

  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;

  deleteConfirmationRule: ExceptionRule | null;
  setDeleteConfirmationRule: React.Dispatch<React.SetStateAction<ExceptionRule | null>>;
  confirmDeleteRule: () => Promise<void>;

  handleExportRules: () => Promise<void>;

  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  typeFilter: ExceptionRuleType | 'all';
  setTypeFilter: React.Dispatch<React.SetStateAction<ExceptionRuleType | 'all'>>;
  sortBy: SortBy;
  setSortBy: React.Dispatch<React.SetStateAction<SortBy>>;

  filteredRules: ExceptionRule[];
  optimisticUpdates: Map<string, ExceptionRule>;
  handleEditRule: (rule: ExceptionRule) => void;
  handleDeleteRule: (rule: ExceptionRule) => void;

  showCreateForm: boolean;
  setShowCreateForm: React.Dispatch<React.SetStateAction<boolean>>;
  editingRule: ExceptionRule | null;
  setEditingRule: React.Dispatch<React.SetStateAction<ExceptionRule | null>>;
  resetForm: () => void;

  formData: RuleManagerFormData;
  setFormData: React.Dispatch<React.SetStateAction<RuleManagerFormData>>;
  formErrors: string[];
  formWarnings: string[];
  duplicateSuggestions: string[];

  handleCreateRule: () => Promise<void>;
  handleUpdateRule: () => Promise<void>;
  savingOperations: Set<string>;
}

export const RuleManagerViewView: React.FC<RuleManagerViewViewProps> = ({
  onClose,
  onRuleSelected,
  tr,
  loading,
  error,
  setError,
  deleteConfirmationRule,
  setDeleteConfirmationRule,
  confirmDeleteRule,
  handleExportRules,
  searchQuery,
  setSearchQuery,
  typeFilter,
  setTypeFilter,
  sortBy,
  setSortBy,
  filteredRules,
  optimisticUpdates,
  handleEditRule,
  handleDeleteRule,
  showCreateForm,
  setShowCreateForm,
  editingRule,
  setEditingRule,
  resetForm,
  formData,
  setFormData,
  formErrors,
  formWarnings,
  duplicateSuggestions,
  handleCreateRule,
  handleUpdateRule,
  savingOperations,
}) => {
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
          <p className="text-center mt-4 text-gray-600 dark:text-gray-400">{tr('加载规则中...', 'Loading rules...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-x-hidden">
      <ConfirmationDialog
        isOpen={deleteConfirmationRule !== null}
        title={tr('确认删除', 'Confirm deletion')}
        message={
          deleteConfirmationRule
            ? tr(`确定要删除规则 "${deleteConfirmationRule.name}" 吗？`, `Delete rule "${deleteConfirmationRule.name}"?`)
            : ''
        }
        confirmText={tr('删除', 'Delete')}
        cancelText={tr('取消', 'Cancel')}
        onConfirm={() => void confirmDeleteRule()}
        onCancel={() => setDeleteConfirmationRule(null)}
      />
      <div
        className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl"
        style={{ maxWidth: 'min(1152px, 100vw - 2rem)' }}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-primary-500/20 flex items-center justify-center">
              <Settings className="text-primary-500" size={20} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{tr('例外规则管理', 'Exception Rules')}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {tr('管理暂停和提前完成的例外规则', 'Manage exception rules for pausing or early completion')}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => void handleExportRules()}
              className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors flex items-center space-x-2"
            >
              <Download size={16} />
              <span>{tr('导出', 'Export')}</span>
            </button>

            <button
              onClick={() => setShowCreateForm(true)}
              className="px-4 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white transition-colors flex items-center space-x-2"
            >
              <Plus size={16} />
              <span>{tr('创建链专属规则', 'Create chain-specific rule')}</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
            >
              {tr('关闭', 'Close')}
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-2xl flex items-center space-x-3">
            <AlertTriangle className="text-red-500" size={20} />
            <span className="text-red-700 dark:text-red-300">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
              ×
            </button>
          </div>
        )}

        <div className="flex h-[calc(90vh-120px)]">
          <div className="flex-1 flex flex-col">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder={tr('搜索规则名称或描述...', 'Search rule name or description...')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as ExceptionRuleType | 'all')}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">{tr('所有类型', 'All types')}</option>
                  <option value={ExceptionRuleType.PAUSE_ONLY}>{tr('仅暂停', 'Pause only')}</option>
                  <option value={ExceptionRuleType.EARLY_COMPLETION_ONLY}>{tr('仅提前完成', 'Early completion only')}</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="usage">{tr('按使用频率', 'Most used')}</option>
                  <option value="name">{tr('按名称', 'Name')}</option>
                  <option value="lastUsed">{tr('按最近使用', 'Last used')}</option>
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {filteredRules.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
                    <Filter className="text-gray-400" size={24} />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    {searchQuery || typeFilter !== 'all'
                      ? tr('没有找到匹配的规则', 'No matching rules')
                      : tr('还没有规则', 'No rules yet')}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    {searchQuery || typeFilter !== 'all'
                      ? tr('尝试调整搜索条件或筛选器', 'Try adjusting your search or filters')
                      : tr('创建第一个例外规则来开始使用', 'Create your first exception rule to get started')}
                  </p>
                  {!searchQuery && typeFilter === 'all' && (
                    <button
                      onClick={() => setShowCreateForm(true)}
                      className="px-6 py-3 rounded-xl bg-primary-500 hover:bg-primary-600 text-white transition-colors"
                    >
                      {tr('创建规则', 'Create rule')}
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid gap-4">
                  {filteredRules.map((rule) => (
                    <RuleItem
                      key={rule.id}
                      rule={rule}
                      isOptimistic={optimisticUpdates.has(rule.id)}
                      onEdit={handleEditRule}
                      onDelete={handleDeleteRule}
                      onSelect={onRuleSelected}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {(showCreateForm || editingRule) && (
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
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as ExceptionRuleType })}
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
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
        )}
      </div>
    </div>
  );
};

