/**
 * IntroDiagrams 组件
 *
 * 这是一个门面文件，实际实现已拆分为独立文件：
 * - DiagramIntegralPreference: 积分偏好图表
 * - DiagramShortVideoLoop: 短视频循环图表
 * - DiagramExamEfficiency: 考试效率图表
 * - DiagramSacredSeat: 神圣座位图表
 * - DiagramDelayMeme: 延迟模因图表
 *
 * @see src/components/intro/diagrams/
 */

export {
  DiagramIntegralPreference,
  DiagramShortVideoLoop,
  DiagramExamEfficiency,
  DiagramSacredSeat,
  DiagramDelayMeme,
} from './diagrams';

export type {
  DiagramProps,
  DiagramIntegralPreferenceProps,
  DiagramShortVideoLoopProps,
  DiagramExamEfficiencyProps,
  DiagramSacredSeatProps,
  DiagramDelayMemeProps,
} from './diagrams';
