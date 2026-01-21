/**
 * RecycleBinModal 组件
 *
 * 这是一个门面文件，实际实现已拆分为 Container/View 模式：
 * - RecycleBinModalContainer: 处理状态和逻辑
 * - RecycleBinModalView: 纯展示组件
 * - useRecycleBinModal: 封装状态和副作用的 hook
 */

export { RecycleBinModalContainer as RecycleBinModal } from './RecycleBinModalContainer';
export type { RecycleBinModalProps } from './RecycleBinModalContainer';
export { RecycleBinModalView } from './RecycleBinModalView';
export type { RecycleBinModalViewProps } from './RecycleBinModalView';
export { useRecycleBinModal } from './useRecycleBinModal';
export type { ConfirmDialogState } from './useRecycleBinModal';
