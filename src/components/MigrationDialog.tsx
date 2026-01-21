/**
 * MigrationDialog 组件
 *
 * 这是一个门面文件，实际实现已拆分为 Container/View 模式：
 * - MigrationDialogContainer: 处理状态和逻辑
 * - MigrationDialogView: 纯展示组件
 * - useMigrationDialog: 封装状态和副作用的 hook
 */

export { MigrationDialog, MigrationDialogContainer } from './MigrationDialogContainer';
export type { MigrationDialogProps } from './MigrationDialogContainer';
export { MigrationDialogView } from './MigrationDialogView';
export type { MigrationDialogViewProps, MigrationSuggestions } from './MigrationDialogView';
export { useMigrationDialog } from './useMigrationDialog';
