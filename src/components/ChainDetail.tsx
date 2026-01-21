/**
 * ChainDetail 组件
 *
 * 这是一个门面文件，实际实现已拆分为 Container/View 模式：
 * - ChainDetailContainer: 处理状态和逻辑
 * - ChainDetailView: 纯展示组件
 * - useChainDetail: 封装状态和副作用的 hook
 */

export { ChainDetailContainer as ChainDetail } from './ChainDetailContainer';
export type { ChainDetailProps } from './ChainDetailContainer';
export { ChainDetailView } from './ChainDetailView';
export type { ChainDetailViewProps } from './ChainDetailView';
export { useChainDetail } from './useChainDetail';
