/**
 * ChainCard 模块导出
 *
 * 采用 Container/View 模式:
 * - ChainCard: Container 组件，处理状态和逻辑
 * - ChainCardView: 纯展示组件
 * - useChainCard: 封装状态和副作用的 hook
 */

export { ChainCard } from './ChainCardContainer';
export { ChainCardView } from './ChainCardView';
export { useChainCard } from './useChainCard';
export type { ChainCardProps, ChainCardViewProps } from './types';
