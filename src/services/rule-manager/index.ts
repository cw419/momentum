/**
 * Rule Manager Module Index
 * Re-exports all rule management services for easy importing
 */

export { RuleCreator, ruleCreator } from './RuleCreator';
export type { RuleCreationResult, RealTimeCheckResult, OptimisticCreationResult } from './RuleCreator';

export { RuleQueryService, ruleQueryService } from './RuleQueryService';
export type { DuplicationSuggestions, RuleUsageSuggestions } from './RuleQueryService';

export { RuleExecutor, ruleExecutor } from './RuleExecutor';
export type { RuleExecutionResult } from './RuleExecutor';

export { RuleStatsService, ruleStatsService } from './RuleStatsService';
export type { RuleTypeStats } from './RuleStatsService';

export { RuleExportImportService, ruleExportImportService } from './RuleExportImportService';
export type { ImportOptions, ImportResult, ExportResult, RuleImportData } from './RuleExportImportService';

export { RuleMaintenanceService, ruleMaintenanceService } from './RuleMaintenanceService';
export type { RuleUpdateResult, CleanupResult, SystemHealthStatus, CleanupOptions } from './RuleMaintenanceService';
