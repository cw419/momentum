/**
 * TaskGroupEditor 组件
 *
 * 这是一个门面文件，实际实现已拆分为 Container/View 模式：
 * - TaskGroupEditorContainer: 处理状态和逻辑
 * - TaskGroupEditorView: 纯展示组件
 * - useTaskGroupEditor: 封装状态和副作用的 hook
 */

export { TaskGroupEditorContainer as TaskGroupEditor } from './TaskGroupEditorContainer';
export type { TaskGroupEditorContainerProps as TaskGroupEditorProps } from './TaskGroupEditorContainer';
export { TaskGroupEditorView } from './TaskGroupEditorView';
export type { TaskGroupEditorViewProps } from './TaskGroupEditorView';
export { useTaskGroupEditor } from './useTaskGroupEditor';
export type { TaskGroupEditorFormErrors, UseTaskGroupEditorProps, UseTaskGroupEditorReturn } from './useTaskGroupEditor';
