/**
 * TaskGroupEditor 组件
 *
 * 这是一个门面文件，实际实现已拆分为 Container/View 模式：
 * - TaskGroupEditorContainer: 处理状态和逻辑
 * - TaskGroupEditorView: 纯展示组件（如需使用请直接从 ./TaskGroupEditorView 引入）
 * - useTaskGroupEditor: 封装状态和副作用的 hook（如需使用请直接从 ./useTaskGroupEditor 引入）
 *
 * @deprecated Remove after 2026-09-30 once direct imports are migrated.
 */

export { TaskGroupEditorContainer as TaskGroupEditor } from './TaskGroupEditorContainer';
