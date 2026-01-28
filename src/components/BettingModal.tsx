/**
 * BettingModal 组件
 *
 * 这是一个门面文件，实际实现已拆分为 Container/View 模式：
 * - BettingModalContainer: 处理状态和逻辑
 * - BettingModalView: 纯展示组件（如需使用请直接从 ./BettingModalView 引入）
 * - useBettingModal: 封装状态和副作用的 hook（如需使用请直接从 ./useBettingModal 引入）
 */

export { BettingModalContainer as BettingModal } from './BettingModalContainer';
