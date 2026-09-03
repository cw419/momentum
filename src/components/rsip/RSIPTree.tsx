import React from 'react';
import { CornerUpLeft, Link2, Pencil, X } from 'lucide-react';
import {
  TransformComponent,
  TransformWrapper,
  type ReactZoomPanPinchContentRef,
} from 'react-zoom-pan-pinch';
import type { RSIPTreeNode } from '../../types';
import { RSIPNodeCard } from './RSIPNodeCard';
import { RSIPControls } from './RSIPControls';
import type { RSIPGroupFrame } from './hooks/useRSIPLayout';
import type { RSIPGroupConnector } from './hooks/useRSIPGroupConnectors';

export type RSIPConnector = { id: string; d: string; isHovered: boolean };

interface RSIPTreeProps {
  tree: RSIPTreeNode[];
  nodePositions: Record<
    string,
    { node: RSIPTreeNode; style: React.CSSProperties }
  >;
  groupFrames: RSIPGroupFrame[];
  groupConnectors: RSIPGroupConnector[];
  connectors: RSIPConnector[];
  containerHeight: number;
  contentBounds: {
    minX: number;
    minY: number;
    width: number;
    height: number;
  } | null;
  viewportRef: React.RefObject<HTMLDivElement>;
  containerRef: React.RefObject<HTMLDivElement>;
  transformRef: React.RefObject<ReactZoomPanPinchContentRef>;
  onTransformed: (state: {
    scale: number;
    positionX: number;
    positionY: number;
  }) => void;
  onFitToContent: () => void;
  now: number;
  activeTimers: Record<string, number>;
  hoveredChainIds: Set<string>;
  pinnedId: string | null;
  reparentingId: string | null;
  invalidParentIds: Set<string>;
  reparentingTitle: string | null;
  relationError: string | null;
  onTogglePinned: (nodeId: string) => void;
  onHoverStart: (nodeId: string) => void;
  onHoverEnd: () => void;
  onToggleReparent: (nodeId: string) => void;
  onCommitReparent: (
    childId: string,
    parentId?: string,
    confirmedGroupMigration?: boolean,
  ) => void;
  onCancelReparent: () => void;
  onSetRelationError: (next: string | null) => void;
  onEditNode: (node: RSIPTreeNode) => void;
  groupReparentingId: string | null;
  invalidParentGroupIds: Set<string>;
  groupRelationError: string | null;
  onEditGroup: (groupId: string) => void;
  onToggleGroupReparent: (groupId: string) => void;
  onCommitGroupReparent: (groupId: string, parentGroupId?: string) => void;
  onCancelGroupReparent: () => void;
  onSetGroupRelationError: (next: string | null) => void;
  onMarkFailed: (nodeId: string) => void;
  onStartTimer: (nodeId: string, minutes: number) => void;
  onStopTimer: (nodeId: string) => void;
  setNodeRef: (nodeId: string, el: HTMLDivElement | null) => void;
  formatRemaining: (ms: number) => string;
  formatMinutesLabel: (minutes: number) => string;
  tr: (zh: string, en: string) => string;
}

export const RSIPTree: React.FC<RSIPTreeProps> = ({
  tree,
  nodePositions,
  groupFrames,
  groupConnectors,
  connectors,
  containerHeight,
  contentBounds,
  viewportRef,
  containerRef,
  transformRef,
  onTransformed,
  onFitToContent,
  now,
  activeTimers,
  hoveredChainIds,
  pinnedId,
  reparentingId,
  invalidParentIds,
  reparentingTitle,
  relationError,
  onTogglePinned,
  onHoverStart,
  onHoverEnd,
  onToggleReparent,
  onCommitReparent,
  onCancelReparent,
  onSetRelationError,
  onEditNode,
  groupReparentingId,
  invalidParentGroupIds,
  groupRelationError,
  onEditGroup,
  onToggleGroupReparent,
  onCommitGroupReparent,
  onCancelGroupReparent,
  onSetGroupRelationError,
  onMarkFailed,
  onStartTimer,
  onStopTimer,
  setNodeRef,
  formatRemaining,
  formatMinutesLabel,
  tr,
}) => {
  return (
    <div ref={viewportRef} className="relative h-[60vh] min-h-[400px] w-full">
      {tree.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center font-chinese text-gray-600 dark:text-slate-400">
          {tr(
            '尚无国策，先从上方表单添加一个吧。',
            'No policies yet. Add one from the form above.',
          )}
        </div>
      ) : (
        <TransformWrapper
          ref={transformRef}
          initialScale={1}
          initialPositionX={0}
          initialPositionY={0}
          minScale={0.1}
          maxScale={2}
          limitToBounds={false}
          panning={{ excluded: ['rsip-node'] }}
          onTransformed={(_, state) => onTransformed(state)}
        >
          {({ zoomIn, zoomOut }) => (
            <>
              <TransformComponent
                wrapperClass="rsip-canvas-wrapper w-full h-full rounded-2xl overflow-hidden"
                contentClass="relative rsip-canvas-content"
              >
                <div
                  ref={containerRef}
                  className="relative"
                  style={{
                    width: contentBounds
                      ? Math.ceil(contentBounds.width + 120)
                      : '100%',
                    height: Math.ceil(
                      Math.max(
                        containerHeight,
                        (contentBounds?.height ?? 0) + 120,
                      ),
                    ),
                  }}
                >
                  {groupFrames.map((group) => {
                    const isGroupReparentingSelected =
                      groupReparentingId === group.id;
                    const isInvalidParentGroup = Boolean(
                      groupReparentingId && invalidParentGroupIds.has(group.id),
                    );
                    return (
                      <div
                        key={group.id}
                        aria-label={tr(
                          `国策组：${group.title}`,
                          `Policy group: ${group.title}`,
                        )}
                        className="pointer-events-none absolute rounded-2xl border-2 border-dashed border-emerald-500/70 bg-emerald-500/[0.04] dark:border-emerald-400/60 dark:bg-emerald-400/[0.08]"
                        style={group.style}
                      >
                        <div className="pointer-events-auto absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-lg border border-emerald-600/70 bg-emerald-600 px-2 py-1 text-center font-chinese text-xs font-semibold text-white shadow-sm dark:border-emerald-400/70 dark:bg-emerald-500">
                          <button
                            type="button"
                            onClick={() => {
                              if (groupReparentingId) {
                                if (isInvalidParentGroup) {
                                  onSetGroupRelationError(
                                    tr(
                                      '不能选择该国策组作为父组（会形成循环）。',
                                      'Cannot choose this policy group as parent (would create a cycle).',
                                    ),
                                  );
                                  return;
                                }
                                onCommitGroupReparent(
                                  groupReparentingId,
                                  group.id,
                                );
                                return;
                              }
                              onEditGroup(group.id);
                            }}
                            className={
                              isInvalidParentGroup
                                ? 'cursor-not-allowed opacity-50'
                                : 'hover:underline'
                            }
                            disabled={isInvalidParentGroup}
                          >
                            {group.emoji ? `${group.emoji} ` : ''}
                            {group.title}
                          </button>
                          {!groupReparentingId && (
                            <>
                              <button
                                type="button"
                                onClick={() => onEditGroup(group.id)}
                                aria-label={tr(
                                  '编辑国策组',
                                  'Edit policy group',
                                )}
                                className="rounded p-0.5 hover:bg-emerald-700/50"
                              >
                                <Pencil size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() => onToggleGroupReparent(group.id)}
                                aria-label={tr(
                                  '更改组从属',
                                  'Change group parent',
                                )}
                                className="rounded p-0.5 hover:bg-emerald-700/50"
                              >
                                <Link2 size={12} />
                              </button>
                            </>
                          )}
                          {isGroupReparentingSelected && (
                            <button
                              type="button"
                              onClick={() => onCancelGroupReparent()}
                              aria-label={tr(
                                '取消更改组从属',
                                'Cancel group reparent',
                              )}
                              className="rounded p-0.5 hover:bg-emerald-700/50"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <svg
                    className="pointer-events-none absolute inset-0 h-full w-full"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <defs>
                      <marker
                        id="rsip-arrow"
                        markerWidth="8"
                        markerHeight="8"
                        refX="6"
                        refY="4"
                        orient="auto"
                        markerUnits="userSpaceOnUse"
                      >
                        <path d="M0,0 L8,4 L0,8 z" fill="#6b7280" />
                      </marker>
                      <marker
                        id="rsip-group-arrow"
                        markerWidth="8"
                        markerHeight="8"
                        refX="6"
                        refY="4"
                        orient="auto"
                        markerUnits="userSpaceOnUse"
                      >
                        <path d="M0,0 L8,4 L0,8 z" fill="#059669" />
                      </marker>
                    </defs>
                    {connectors.map(({ id, d, isHovered }) => (
                      <path
                        key={id}
                        d={d}
                        fill="none"
                        stroke={isHovered ? '#f59e0b' : '#9ca3af'}
                        strokeWidth={isHovered ? 3 : 2}
                        className="transition duration-200"
                        markerEnd="url(#rsip-arrow)"
                      />
                    ))}
                    {groupConnectors.map(({ id, d }) => (
                      <path
                        key={id}
                        d={d}
                        fill="none"
                        stroke="#059669"
                        strokeWidth={3}
                        strokeDasharray="7 5"
                        markerEnd="url(#rsip-group-arrow)"
                      />
                    ))}
                  </svg>

                  {Object.values(nodePositions).map(({ node, style }) => {
                    const endsAt = activeTimers[node.id];
                    const isRunning = Boolean(endsAt && endsAt > now);
                    const remaining = isRunning && endsAt ? endsAt - now : 0;
                    const timerMinutes = node.timerMinutes || 15;
                    const isInvalidParentTarget = Boolean(
                      reparentingId && invalidParentIds.has(node.id),
                    );
                    const isReparentingSelected = reparentingId === node.id;

                    return (
                      <RSIPNodeCard
                        key={node.id}
                        node={node}
                        style={style}
                        setNodeRef={(el) => setNodeRef(node.id, el)}
                        isHighlighted={hoveredChainIds.has(node.id)}
                        isPinned={pinnedId === node.id}
                        isInvalidParentTarget={isInvalidParentTarget}
                        isReparentingSelected={isReparentingSelected}
                        onCardClick={() => {
                          if (reparentingId) {
                            if (isInvalidParentTarget) {
                              onSetRelationError(
                                tr(
                                  '不能选择该节点作为父节点（会形成循环）。',
                                  'Cannot choose this node as parent (would create a cycle).',
                                ),
                              );
                              return;
                            }
                            onCommitReparent(reparentingId, node.id);
                            return;
                          }
                          onTogglePinned(node.id);
                        }}
                        onHoverStart={() => onHoverStart(node.id)}
                        onHoverEnd={onHoverEnd}
                        onToggleReparent={() => onToggleReparent(node.id)}
                        onEdit={() => onEditNode(node)}
                        onMarkFailed={() => onMarkFailed(node.id)}
                        timer={{
                          isRunning,
                          remainingMs: remaining,
                          minutes: timerMinutes,
                          onStart: () => onStartTimer(node.id, timerMinutes),
                          onStop: () => onStopTimer(node.id),
                        }}
                        formatRemaining={formatRemaining}
                        formatMinutesLabel={formatMinutesLabel}
                        tr={tr}
                      />
                    );
                  })}
                </div>
              </TransformComponent>

              {reparentingId && (
                <div className="pointer-events-none absolute left-4 right-4 top-4 z-30">
                  <div className="pointer-events-auto flex flex-col gap-3 rounded-2xl border border-white/50 bg-white/70 px-4 py-3 shadow-[0_18px_40px_-28px_rgba(0,0,0,0.5)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/50 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="font-chinese text-sm text-gray-900 dark:text-slate-100">
                        {tr('选择新的父节点', 'Select a new parent')}
                      </div>
                      <div className="font-chinese text-xs text-gray-600 dark:text-slate-300">
                        {tr('正在移动：', 'Moving: ')}
                        <span className="font-semibold">
                          {reparentingTitle ?? reparentingId}
                        </span>
                        {tr(
                          '。点击目标节点作为父节点，或设为根。',
                          '. Tap a node to set as parent, or make it a root.',
                        )}
                      </div>
                      {relationError && (
                        <div className="mt-1 font-chinese text-xs text-red-600 dark:text-red-300">
                          {relationError}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() =>
                          onCommitReparent(reparentingId, undefined)
                        }
                        className="inline-flex items-center gap-2 rounded-2xl border border-gray-200/60 bg-white/80 px-3 py-2 shadow-sm transition hover:shadow-md dark:border-slate-600/60 dark:bg-slate-800/70"
                      >
                        <CornerUpLeft size={16} />
                        <span className="font-chinese text-sm">
                          {tr('设为根', 'Make root')}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={onCancelReparent}
                        className="inline-flex items-center gap-2 rounded-2xl border border-gray-200/60 bg-white/80 px-3 py-2 shadow-sm transition hover:shadow-md dark:border-slate-600/60 dark:bg-slate-800/70"
                      >
                        <X size={16} />
                        <span className="font-chinese text-sm">
                          {tr('取消', 'Cancel')}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {groupReparentingId && (
                <div className="pointer-events-none absolute left-4 right-4 top-4 z-30">
                  <div className="pointer-events-auto flex flex-col gap-3 rounded-2xl border border-white/50 bg-white/70 px-4 py-3 shadow-[0_18px_40px_-28px_rgba(0,0,0,0.5)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/50 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="font-chinese text-sm text-gray-900 dark:text-slate-100">
                        {tr('选择父国策组', 'Select a parent policy group')}
                      </div>
                      <div className="font-chinese text-xs text-gray-600 dark:text-slate-300">
                        {tr(
                          '点击另一组建立从属关系，或将当前组设为根组。',
                          'Click another group to set it as parent, or make the current group a root.',
                        )}
                      </div>
                      {groupRelationError && (
                        <div className="mt-1 font-chinese text-xs text-red-600 dark:text-red-300">
                          {groupRelationError}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() =>
                          onCommitGroupReparent(groupReparentingId, undefined)
                        }
                        className="inline-flex items-center gap-2 rounded-2xl border border-gray-200/60 bg-white/80 px-3 py-2 shadow-sm transition hover:shadow-md dark:border-slate-600/60 dark:bg-slate-800/70"
                      >
                        <CornerUpLeft size={16} />
                        <span className="font-chinese text-sm">
                          {tr('设为根组', 'Make root group')}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={onCancelGroupReparent}
                        className="inline-flex items-center gap-2 rounded-2xl border border-gray-200/60 bg-white/80 px-3 py-2 shadow-sm transition hover:shadow-md dark:border-slate-600/60 dark:bg-slate-800/70"
                      >
                        <X size={16} />
                        <span className="font-chinese text-sm">
                          {tr('取消', 'Cancel')}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <RSIPControls
                onZoomIn={zoomIn}
                onZoomOut={zoomOut}
                onFitToContent={onFitToContent}
                tr={tr}
              />
            </>
          )}
        </TransformWrapper>
      )}
    </div>
  );
};
