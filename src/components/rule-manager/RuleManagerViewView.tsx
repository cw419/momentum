import React from 'react';
import {
  AlertTriangle,
  Download,
  Filter,
  Plus,
  Search,
  Settings,
} from 'lucide-react';
import { ExceptionRuleType } from '../../types';
import RuleItem from '../RuleItem';
import { ConfirmationDialog } from '../ConfirmationDialog';
import type { RuleManagerViewViewProps } from './types';
import { RuleManagerFormModal } from './components/RuleManagerFormModal';

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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="rounded-3xl bg-white p-8 dark:bg-gray-800">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary-500"></div>
          <p className="mt-4 text-center text-gray-600 dark:text-gray-400">
            {tr('加载规则中...', 'Loading rules...')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-x-hidden bg-black/80 p-4 backdrop-blur-sm">
      <ConfirmationDialog
        isOpen={deleteConfirmationRule !== null}
        title={tr('确认删除', 'Confirm deletion')}
        message={
          deleteConfirmationRule
            ? tr(
                `确定要删除规则 "${deleteConfirmationRule.name}" 吗？`,
                `Delete rule "${deleteConfirmationRule.name}"?`,
              )
            : ''
        }
        confirmText={tr('删除', 'Delete')}
        cancelText={tr('取消', 'Cancel')}
        onConfirm={() => void confirmDeleteRule()}
        onCancel={() => setDeleteConfirmationRule(null)}
      />
      <div
        className="max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-gray-800"
        style={{ maxWidth: 'min(1152px, 100vw - 2rem)' }}
      >
        <div className="flex items-center justify-between border-b border-gray-200 p-6 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-500/20">
              <Settings className="text-primary-500" size={20} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {tr('例外规则管理', 'Exception Rules')}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {tr(
                  '管理暂停和提前完成的例外规则',
                  'Manage exception rules for pausing or early completion',
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => void handleExportRules()}
              className="flex items-center space-x-2 rounded-xl bg-gray-100 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              <Download size={16} />
              <span>{tr('导出', 'Export')}</span>
            </button>

            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center space-x-2 rounded-xl bg-primary-500 px-4 py-2 text-white transition-colors hover:bg-primary-600"
            >
              <Plus size={16} />
              <span>{tr('创建链专属规则', 'Create chain-specific rule')}</span>
            </button>

            <button
              onClick={onClose}
              className="rounded-xl bg-gray-100 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              {tr('关闭', 'Close')}
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 flex items-center space-x-3 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-500/30 dark:bg-red-500/10">
            <AlertTriangle className="text-red-500" size={20} />
            <span className="text-red-700 dark:text-red-300">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        )}

        <div className="flex h-[calc(90vh-120px)]">
          <div className="flex flex-1 flex-col">
            <div className="border-b border-gray-200 p-6 dark:border-gray-700">
              <div className="flex items-center space-x-4">
                <div className="relative flex-1">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 transform text-gray-400"
                    size={20}
                  />
                  <input
                    type="text"
                    placeholder={tr(
                      '搜索规则名称或描述...',
                      'Search rule name or description...',
                    )}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <select
                  value={typeFilter}
                  onChange={(e) =>
                    setTypeFilter(e.target.value as ExceptionRuleType | 'all')
                  }
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="all">{tr('所有类型', 'All types')}</option>
                  <option value={ExceptionRuleType.PAUSE_ONLY}>
                    {tr('仅暂停', 'Pause only')}
                  </option>
                  <option value={ExceptionRuleType.EARLY_COMPLETION_ONLY}>
                    {tr('仅提前完成', 'Early completion only')}
                  </option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="usage">{tr('按使用频率', 'Most used')}</option>
                  <option value="name">{tr('按名称', 'Name')}</option>
                  <option value="lastUsed">
                    {tr('按最近使用', 'Last used')}
                  </option>
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {filteredRules.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                    <Filter className="text-gray-400" size={24} />
                  </div>
                  <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
                    {searchQuery || typeFilter !== 'all'
                      ? tr('没有找到匹配的规则', 'No matching rules')
                      : tr('还没有规则', 'No rules yet')}
                  </h3>
                  <p className="mb-4 text-gray-500 dark:text-gray-400">
                    {searchQuery || typeFilter !== 'all'
                      ? tr(
                          '尝试调整搜索条件或筛选器',
                          'Try adjusting your search or filters',
                        )
                      : tr(
                          '创建第一个例外规则来开始使用',
                          'Create your first exception rule to get started',
                        )}
                  </p>
                  {!searchQuery && typeFilter === 'all' && (
                    <button
                      onClick={() => setShowCreateForm(true)}
                      className="rounded-xl bg-primary-500 px-6 py-3 text-white transition-colors hover:bg-primary-600"
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

        <RuleManagerFormModal
          isOpen={showCreateForm || editingRule !== null}
          editingRule={editingRule}
          tr={tr}
          formErrors={formErrors}
          formWarnings={formWarnings}
          duplicateSuggestions={duplicateSuggestions}
          formData={formData}
          setFormData={setFormData}
          setShowCreateForm={setShowCreateForm}
          setEditingRule={setEditingRule}
          resetForm={resetForm}
          handleCreateRule={handleCreateRule}
          handleUpdateRule={handleUpdateRule}
          savingOperations={savingOperations}
        />
      </div>
    </div>
  );
};
