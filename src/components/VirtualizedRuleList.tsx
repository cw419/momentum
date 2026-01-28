/**
 * 虚拟化规则列表组件
 * 支持大量规则的高性能渲染
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ExceptionRule } from '../types';
import { SearchResult } from '../utils/ruleSearchOptimizer';
import { CheckCircle, Plus, TrendingUp, History } from 'lucide-react';
import { useI18n } from '../i18n';

interface VirtualizedRuleListProps {
  rules: SearchResult[];
  onSelect: (rule: ExceptionRule) => void;
  onCreateNew?: (name: string) => void;
  searchQuery?: string;
  isLoading?: boolean;
  itemHeight?: number;
  containerHeight?: number;
  overscan?: number;
}

interface VirtualItem {
  index: number;
  start: number;
  end: number;
}

export const VirtualizedRuleList: React.FC<VirtualizedRuleListProps> = ({
  rules,
  onSelect,
  onCreateNew,
  searchQuery = '',
  isLoading = false,
  itemHeight = 50, // 修改默认高度
  containerHeight = 400,
  overscan = 5
}) => {
  const { language, tr } = useI18n();
  const [scrollTop, setScrollTop] = useState(0);
  const [containerSize, setContainerSize] = useState({ width: 0, height: containerHeight });
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  // 计算可见项目范围
  const visibleRange = useMemo(() => {
    const totalItems = rules.length + (onCreateNew && searchQuery ? 1 : 0);
    
    if (totalItems === 0) {
      return { start: 0, end: 0, totalItems: 0 };
    }

    const start = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.ceil(containerSize.height / itemHeight);
    const end = Math.min(start + visibleCount + overscan, totalItems);
    const adjustedStart = Math.max(0, start - overscan);

    return {
      start: adjustedStart,
      end,
      totalItems
    };
  }, [scrollTop, itemHeight, containerSize.height, rules.length, overscan, onCreateNew, searchQuery]);

  // 计算虚拟项目
  const virtualItems = useMemo((): VirtualItem[] => {
    const items: VirtualItem[] = [];
    
    for (let i = visibleRange.start; i < visibleRange.end; i++) {
      items.push({
        index: i,
        start: i * itemHeight,
        end: (i + 1) * itemHeight
      });
    }
    
    return items;
  }, [visibleRange, itemHeight]);

  // 总高度
  const totalHeight = visibleRange.totalItems * itemHeight;

  // 滚动处理（节流）
  // 注意：不要把 React 合成事件对象传给节流函数（事件可能被复用/清空），只传递必要的值。
  const handleScroll = useMemo(
    () =>
      throttle((nextScrollTop: number) => {
        setScrollTop(nextScrollTop);
      }, 16),
    []
  );

  const onScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      handleScroll(e.currentTarget.scrollTop);
    },
    [handleScroll]
  );

  // 容器大小变化处理
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({
          width: rect.width,
          height: rect.height
        });
      }
    };

    updateSize();
    
    const resizeObserver = new ResizeObserver(updateSize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // 高亮搜索匹配的文本
  const highlightText = useCallback((text: string, ranges: Array<{ start: number; end: number }>) => {
    // 确保text是字符串
    const safeText = String(text || '');
    if (!ranges.length) return safeText;

    const parts = [];
    let lastIndex = 0;

    for (const range of ranges) {
      if (range.start > lastIndex) {
        parts.push(safeText.slice(lastIndex, range.start));
      }
      parts.push(
        <mark key={`${range.start}-${range.end}`} className="bg-yellow-200 dark:bg-yellow-600 px-1 rounded">
          {safeText.slice(range.start, range.end)}
        </mark>
      );
      lastIndex = range.end;
    }

    if (lastIndex < safeText.length) {
      parts.push(safeText.slice(lastIndex));
    }

    return parts;
  }, []);

  // 格式化最后使用时间
  const formatLastUsed = useCallback((date: Date): string => {
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffHours < 1) return tr('刚刚', 'Just now');
    if (diffHours < 24) return language === 'zh' ? `${diffHours}小时前` : `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return tr('昨天', 'Yesterday');
    if (diffDays < 7) return language === 'zh' ? `${diffDays}天前` : `${diffDays}d ago`;
    const weeks = Math.floor(diffDays / 7);
    return language === 'zh' ? `${weeks}周前` : `${weeks}w ago`;
  }, [language, tr]);

  // 获取匹配类型标签
  const getMatchTypeLabel = useCallback((matchType: string): string => {
    switch (matchType) {
      case 'prefix': return tr('前缀匹配', 'Prefix match');
      case 'contains': return tr('包含匹配', 'Contains match');
      case 'fuzzy': return tr('模糊匹配', 'Fuzzy match');
      default: return '';
    }
  }, [tr]);

  // 渲染创建新规则项
  const renderCreateNewItem = useCallback(() => {
    if (!onCreateNew || !searchQuery) return null;

	  return (
      <div
        className="absolute w-full"
        style={{
          height: itemHeight,
          top: 0,
          left: 0
        }}
      >
        <button
          type="button"
          onClick={() => onCreateNew(searchQuery)}
          aria-label={tr(`创建新规则: "${searchQuery}"`, `Create new rule: "${searchQuery}"`)}
          className="w-full flex items-center space-x-3 p-4 rounded-xl bg-primary-50 dark:bg-primary-500/10 border border-primary-200 dark:border-primary-500/30 hover:bg-primary-100 dark:hover:bg-primary-500/20 transition-colors text-left"
          style={{ height: itemHeight }}
        >
          <Plus className="text-primary-500 flex-shrink-0" size={20} aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-primary-700 dark:text-primary-300 truncate">
              {tr(`创建新规则: "${searchQuery}"`, `Create new rule: "${searchQuery}"`)}
            </div>
            <div className="text-sm text-primary-600 dark:text-primary-400">
              {tr('为当前任务链创建专属规则', 'Create a chain-specific rule')}
            </div>
          </div>
        </button>
      </div>
    );
  }, [onCreateNew, searchQuery, itemHeight, tr]);

  // 渲染规则项
  const renderRuleItem = useCallback((result: SearchResult, index: number) => {
    const rule = result.rule;
    const usageCount = rule.usageCount || 0;
    const usageUnit = usageCount === 1 ? 'time' : 'times';
    const usageText = language === 'zh' ? `使用过 ${usageCount} 次` : `Used ${usageCount} ${usageUnit}`;
    const actualIndex = onCreateNew && searchQuery ? index - 1 : index;
    
    if (actualIndex < 0 || actualIndex >= rules.length) return null;

    return (
      <div
        className="absolute w-full rule-item"
        style={{
          height: itemHeight,
          top: index * itemHeight,
          left: 0
        }}
        data-rule-item
      >
        <button
          type="button"
          onClick={() => onSelect(rule)}
          className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition duration-200 text-left border border-transparent hover:border-primary-200 dark:hover:border-primary-500/30"
          style={{ height: itemHeight }}
        >
          <div className="flex-1 min-w-0">
            <div className="font-medium text-gray-900 dark:text-white truncate">
              {highlightText(rule.name, result.highlightRanges)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center space-x-4">
              <span className="flex items-center space-x-1">
                <TrendingUp size={12} aria-hidden="true" />
                <span>
                  {usageText}
                </span>
              </span>
              {rule.lastUsedAt && (
                <span className="flex items-center space-x-1">
                  <History size={12} aria-hidden="true" />
                  <span>{formatLastUsed(rule.lastUsedAt)}</span>
                </span>
              )}
              {result.matchType !== 'exact' && (
                <span className="text-primary-500 text-xs">
                  {getMatchTypeLabel(result.matchType)}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 ml-4">
            {/* 使用频率可视化 */}
            <div className="flex items-center space-x-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-1 h-4 rounded-full ${
                    i < Math.min((rule.usageCount || 0) / 2, 5)
                      ? 'bg-primary-500'
                      : 'bg-gray-200 dark:bg-gray-600'
                  }`}
                />
              ))}
            </div>
            <CheckCircle className="text-gray-400 hover:text-primary-500 transition-colors flex-shrink-0" size={20} aria-hidden="true" />
          </div>
        </button>
      </div>
    );
  }, [rules, onSelect, itemHeight, onCreateNew, searchQuery, language, highlightText, formatLastUsed, getMatchTypeLabel]);

  // 渲染空状态
  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-gray-500 dark:text-gray-400 mb-4">
        {searchQuery ? tr('未找到匹配的规则', 'No matching rules found') : tr('暂无可用规则', 'No rules available')}
      </div>
      {searchQuery && onCreateNew && (
        <button
          type="button"
          onClick={() => onCreateNew(searchQuery)}
          aria-label={tr(`创建 "${searchQuery}"`, `Create "${searchQuery}"`)}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
        >
          <Plus size={16} aria-hidden="true" />
          <span>{tr(`创建 "${searchQuery}"`, `Create "${searchQuery}"`)}</span>
        </button>
      )}
    </div>
  );

  // 渲染加载状态
  const renderLoadingState = () => (
    <div className="flex items-center justify-center py-12" role="status" aria-live="polite">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      <span className="ml-3 text-gray-600 dark:text-gray-400">{tr('加载规则中...', 'Loading rules...')}</span>
    </div>
  );

  if (isLoading) {
    return (
      <div ref={containerRef} style={{ height: containerHeight }}>
        {renderLoadingState()}
      </div>
    );
  }

  if (visibleRange.totalItems === 0) {
    return (
      <div ref={containerRef} style={{ height: containerHeight }}>
        {renderEmptyState()}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative"
      style={{ height: containerHeight }}
    >
      <div
        ref={scrollElementRef}
        className="overflow-auto h-full"
        onScroll={onScroll}
        style={{
          overscrollBehavior: 'contain',
          scrollBehavior: 'smooth'
        }}
      >
        {/* 虚拟滚动容器 */}
        <div
          className="relative"
          style={{ height: totalHeight }}
        >
          {/* 渲染可见项目 */}
          {virtualItems.map((virtualItem) => {
            const isCreateNewItem = onCreateNew && searchQuery && virtualItem.index === 0;
            
            if (isCreateNewItem) {
              return (
                <div
                  key="create-new"
                  style={{
                    position: 'absolute',
                    top: virtualItem.start,
                    left: 0,
                    right: 0,
                    height: itemHeight
                  }}
                >
                  {renderCreateNewItem()}
                </div>
              );
            }

            const ruleIndex = onCreateNew && searchQuery ? virtualItem.index - 1 : virtualItem.index;
            const result = rules[ruleIndex];
            
            if (!result) return null;

            return (
              <div
                key={result.rule.id}
                style={{
                  position: 'absolute',
                  top: virtualItem.start,
                  left: 0,
                  right: 0,
                  height: itemHeight
                }}
              >
                {renderRuleItem(result, virtualItem.index)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// 节流函数
function throttle<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let previous = 0;

  return function executedFunction(...args: Parameters<T>) {
    const now = Date.now();
    const remaining = wait - (now - previous);

    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      func(...args);
    } else if (!timeout) {
      timeout = setTimeout(() => {
        previous = Date.now();
        timeout = null;
        func(...args);
      }, remaining);
    }
  };
}
