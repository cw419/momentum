/**
 * ChainCard 组件
 *
 * 这是一个门面文件，实际实现已拆分为 Container/View 模式：
 * - ChainCardContainer: 处理状态和逻辑
 * - ChainCardView: 纯展示组件
 * - useChainCard: 封装状态和副作用的 hook
 *
 * @see src/components/chain-card/
 */

export { ChainCard, ChainCardView, useChainCard } from './chain-card';
export type { ChainCardProps, ChainCardViewProps } from './chain-card';
