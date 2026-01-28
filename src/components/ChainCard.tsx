/**
 * ChainCard 组件
 *
 * 这是一个门面文件，实际实现已拆分为 Container/View 模式：
 * - ChainCardContainer: 处理状态和逻辑
 * - ChainCardView: 纯展示组件（如需使用请直接从 ./chain-card/ChainCardView 引入）
 * - useChainCard: 封装状态和副作用的 hook（如需使用请直接从 ./chain-card/useChainCard 引入）
 *
 * @see src/components/chain-card/
 */

export { ChainCard } from './chain-card';
