/**
 * RecycleBinModal 组件
 *
 * 这是一个门面文件，实际实现已拆分为 Container/View 模式：
 * - RecycleBinModalContainer: 处理状态和逻辑
 * - RecycleBinModalView: 纯展示组件（如需使用请直接从 ./RecycleBinModalView 引入）
 * - useRecycleBinModal: 封装状态和副作用的 hook（如需使用请直接从 ./useRecycleBinModal 引入）
 */

export { RecycleBinModalContainer as RecycleBinModal } from './RecycleBinModalContainer';
