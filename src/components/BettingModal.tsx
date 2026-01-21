/**
 * BettingModal 组件
 *
 * 这是一个门面文件，实际实现已拆分为 Container/View 模式：
 * - BettingModalContainer: 处理状态和逻辑
 * - BettingModalView: 纯展示组件
 * - useBettingModal: 封装状态和副作用的 hook
 */

export { BettingModalContainer as BettingModal } from './BettingModalContainer';
export type { BettingModalProps } from './BettingModalContainer';
export { BettingModalView } from './BettingModalView';
export type { BettingModalViewProps } from './BettingModalView';
export { useBettingModal } from './useBettingModal';

import { BettingModalContainer } from './BettingModalContainer';
export default BettingModalContainer;
