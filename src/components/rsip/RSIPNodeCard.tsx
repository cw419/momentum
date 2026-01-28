import React from 'react';
import { Clock, Link2, Play, Trash2, X } from 'lucide-react';
import type { RSIPTreeNode } from '../../types';
import { rsipTypeColorMap } from './rsipUi';

interface RSIPNodeCardProps {
  node: RSIPTreeNode;
  style: React.CSSProperties;
  setNodeRef: (el: HTMLDivElement | null) => void;
  isHighlighted: boolean;
  isPinned: boolean;
  isInvalidParentTarget: boolean;
  isReparentingSelected: boolean;
  onCardClick: () => void;
  onHoverStart: () => void;
  onHoverEnd: () => void;
  onToggleReparent: () => void;
  onMarkFailed: () => void;
  timer: {
    isRunning: boolean;
    remainingMs: number;
    minutes: number;
    onStart: () => void;
    onStop: () => void;
  };
  formatRemaining: (ms: number) => string;
  formatMinutesLabel: (minutes: number) => string;
  tr: (zh: string, en: string) => string;
}

export const RSIPNodeCard: React.FC<RSIPNodeCardProps> = ({
  node,
  style,
  setNodeRef,
  isHighlighted,
  isPinned,
  isInvalidParentTarget,
  isReparentingSelected,
  onCardClick,
  onHoverStart,
  onHoverEnd,
  onToggleReparent,
  onMarkFailed,
  timer,
  formatRemaining,
  formatMinutesLabel,
  tr,
}) => {
  const ntype = node.type || 'policy';
  const color = rsipTypeColorMap[ntype] || rsipTypeColorMap.policy;

  const baseZ = Number(style.top) || 0;
  const zIndex = isReparentingSelected
    ? 90
    : isPinned
      ? 80
      : isHighlighted
        ? 70
        : 10 + Math.floor(baseZ / 10);

  const highlightClass = isHighlighted ? `ring-2 ${color.ring} scale-105 shadow-2xl` : '';

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, zIndex }}
      onClick={onCardClick}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
      role="button"
      tabIndex={0}
      aria-label={`${node.emoji || '📌'} ${node.title}`}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onCardClick();
        }
      }}
      className={`rsip-node absolute w-64 rounded-2xl p-4 backdrop-blur-sm shadow-lg transition duration-300 transform-gpu ${color.bg} ${color.border} ${highlightClass} ${isInvalidParentTarget ? 'opacity-40 saturate-50 cursor-not-allowed' : 'cursor-pointer'} ${isReparentingSelected ? 'ring-2 ring-emerald-400 dark:ring-emerald-500 shadow-2xl' : ''}`}
    >
      <div className="flex items-start space-x-3">
        <div className="text-3xl leading-none pt-1" aria-hidden>
          {node.emoji || '📝'}
        </div>
        <div className="flex-1">
          <h4 className="text-md font-bold font-chinese text-gray-900 dark:text-slate-100 rsip-title-clamp">
            {node.title}
          </h4>
          <p className="text-xs text-gray-600 dark:text-slate-400 font-chinese rsip-rule-clamp mt-1">{node.rule}</p>
        </div>
      </div>
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center space-x-2">
          {node.useTimer && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (timer.isRunning) {
                  timer.onStop();
                } else {
                  timer.onStart();
                }
              }}
              className={`inline-flex items-center text-xs px-2 py-1 rounded-xl transition-colors ${timer.isRunning ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 animate-pulse' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'}`}
            >
              {timer.isRunning ? (
                <>
                  <Clock size={12} className="mr-1" /> {formatRemaining(timer.remainingMs)}
                </>
              ) : (
                <>
                  <Play size={12} className="mr-1" /> {formatMinutesLabel(timer.minutes)}
                </>
              )}
            </button>
          )}
        </div>
        <div className="flex items-center space-x-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleReparent();
            }}
            className={`p-1.5 rounded-lg transition-colors ${isReparentingSelected ? 'text-gray-700 dark:text-slate-200 bg-gray-100 dark:bg-slate-700' : 'text-gray-500 hover:text-gray-700 dark:text-slate-300 dark:hover:text-slate-100 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
            title={isReparentingSelected ? tr('取消更改继承', 'Cancel reparent') : tr('更改继承关系', 'Change parent')}
            aria-label={isReparentingSelected ? tr('取消更改继承', 'Cancel reparent') : tr('更改继承关系', 'Change parent')}
          >
            {isReparentingSelected ? <X size={14} /> : <Link2 size={14} />}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMarkFailed();
            }}
            className="p-1.5 text-red-500 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            title={tr('判定失败（删除此节点及其所有子节点）', 'Mark as failed (delete this node and all descendants)')}
            aria-label={tr('判定失败', 'Mark as failed')}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
