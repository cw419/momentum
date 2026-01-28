/**
 * ChainDetail 组件
 *
 * 这是一个门面文件，实际实现已拆分为 Container/View 模式：
 * - ChainDetailContainer: 处理状态和逻辑
 * - ChainDetailView: 纯展示组件（如需使用请直接从 ./ChainDetailView 引入）
 * - useChainDetail: 封装状态和副作用的 hook（如需使用请直接从 ./useChainDetail 引入）
 */

export { ChainDetailContainer as ChainDetail } from './ChainDetailContainer';
