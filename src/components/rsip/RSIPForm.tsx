import React, { useMemo } from 'react';
import { Clock, Plus } from 'lucide-react';
import type { RSIPMeta, RSIPTreeNode } from '../../types';
import { getRsipTypeLabel, rsipTypeEmojiMap } from './rsipUi';

interface RSIPFormProps {
  tree: RSIPTreeNode[];
  meta: RSIPMeta;
  canAddToday: boolean;
  selectedParentId: string | undefined;
  setSelectedParentId: (id: string | undefined) => void;
  title: string;
  setTitle: (title: string) => void;
  rule: string;
  setRule: (rule: string) => void;
  createUseTimer: boolean;
  setCreateUseTimer: (enabled: boolean) => void;
  createTimerMinutes: number;
  setCreateTimerMinutes: (minutes: number) => void;
  createType: string;
  setCreateType: (type: string) => void;
  setCreateEmoji: (emoji: string) => void;
  onAdd: () => void;
  language: string;
  tr: (zh: string, en: string) => string;
}

export const RSIPForm: React.FC<RSIPFormProps> = ({
  tree,
  meta,
  canAddToday,
  selectedParentId,
  setSelectedParentId,
  title,
  setTitle,
  rule,
  setRule,
  createUseTimer,
  setCreateUseTimer,
  createTimerMinutes,
  setCreateTimerMinutes,
  createType,
  setCreateType,
  setCreateEmoji,
  onAdd,
  language,
  tr,
}) => {
  const parentOptions = useMemo(() => {
    const res: RSIPTreeNode[] = [];
    const walk = (n: RSIPTreeNode) => {
      res.push(n);
      n.children.forEach(walk);
    };
    tree.forEach(walk);
    return res;
  }, [tree]);

  const isAddDisabled = !canAddToday || !title.trim() || !rule.trim();

  return (
    <div className="bento-card mb-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 font-chinese">
            {tr('父节点（可空，表示新分支）', 'Parent (optional; empty = new branch)')}
          </label>
          <select
            value={selectedParentId || ''}
            onChange={e => setSelectedParentId(e.target.value || undefined)}
            className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl px-4 py-3 text-gray-900 dark:text-slate-100 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-300 font-chinese"
          >
            <option value="">{tr('（无父节点，建立新根）', '(No parent; create new root)')}</option>
            {parentOptions.map(n => (
              <option key={n.id} value={n.id}>
                {'—'.repeat(n.depth)}
                {n.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 font-chinese">
            {tr('国策标题', 'Policy title')}
          </label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={tr('例如：进门5分钟内开始洗澡', 'e.g. Start showering within 15 minutes of getting home')}
            className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl px-4 py-3 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-300 font-chinese"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 font-chinese">{tr('精准规则', 'Rule')}</label>
          <input
            value={rule}
            onChange={e => setRule(e.target.value)}
            placeholder={tr(
              '例如：回家即启动15分钟计时，计时内进浴室',
              'e.g. Start a 15-minute timer when home; enter the bathroom before it ends'
            )}
            className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl px-4 py-3 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-300 font-chinese"
          />
        </div>
      </div>

      {/* Timer settings */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex items-center justify-between bento-subtle px-4 py-3 rounded-2xl">
          <div className="flex items-center space-x-2">
            <Clock size={16} className="text-emerald-600" />
            <span className="text-sm font-chinese text-gray-700 dark:text-slate-300">{tr('启用计时', 'Enable timer')}</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={createUseTimer}
              onChange={(e) => setCreateUseTimer(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-500"></div>
          </label>
        </div>

        <div className={`${createUseTimer ? '' : 'opacity-60'}`}>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 font-chinese">{tr('计时分钟数', 'Timer minutes')}</label>
          <input
            type="number"
            min={1}
            max={180}
            disabled={!createUseTimer}
            value={createTimerMinutes}
            onChange={(e) => setCreateTimerMinutes(Math.max(1, Math.min(180, Number(e.target.value) || 1)))}
            className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl px-4 py-3 text-gray-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-300 font-chinese"
          />
        </div>
      </div>

      {/* Type selection */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 font-chinese">{tr('节点类型', 'Node type')}</label>
          <select
            value={createType}
            onChange={e => {
              const t = e.target.value;
              setCreateType(t);
              setCreateEmoji(rsipTypeEmojiMap[t] || '📜');
            }}
            className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl px-3 py-2 text-gray-900 dark:text-slate-100 focus:outline-none transition-all duration-200 font-chinese"
          >
            {Object.entries(rsipTypeEmojiMap).map(([type, emoji]) => (
              <option key={type} value={type}>
                {emoji} {getRsipTypeLabel(language, type)} ({type})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm font-chinese text-gray-600 dark:text-slate-400">
          {meta.allowMultiplePerDay
            ? tr('已开启“一天可多条”。今日可继续新增。', 'Multiple per day is enabled. You can add more today.')
            : tr('每天最多新增一个国策。', 'Add at most one policy per day.')}{' '}
          {!meta.allowMultiplePerDay &&
            (canAddToday
              ? tr('今日可新增。', 'You can add today.')
              : tr('今日已新增，明日继续。', 'Already added today. Try again tomorrow.'))}
        </div>
        <button
          onClick={onAdd}
          disabled={isAddDisabled}
          className={`flex items-center space-x-2 px-6 py-3 rounded-2xl font-medium transition-all duration-300 shadow-lg ${isAddDisabled ? 'bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-slate-500' : 'gradient-primary text-white hover:shadow-xl hover:scale-105'}`}
        >
          <Plus size={18} />
          <span className="font-chinese">{tr('新增国策', 'Add policy')}</span>
        </button>
      </div>
    </div>
  );
};

