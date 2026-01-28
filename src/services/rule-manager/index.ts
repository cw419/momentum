/**
 * Rule Manager Module Index
 * Re-exports all rule management services for easy importing
 */

export { ruleCreator } from './RuleCreator';
export type { RuleCreationResult, RealTimeCheckResult, OptimisticCreationResult } from './RuleCreator';

export { ruleQueryService } from './RuleQueryService';
export type { DuplicationSuggestions, RuleUsageSuggestions } from './RuleQueryService';

export { ruleExecutor } from './RuleExecutor';
export type { RuleExecutionResult } from './RuleExecutor';

export { ruleStatsService } from './RuleStatsService';
export type { RuleTypeStats } from './RuleStatsService';

export { ruleExportImportService } from './RuleExportImportService';
export type { ImportResult, ExportResult } from './RuleExportImportService';

export { ruleMaintenanceService } from './RuleMaintenanceService';
export type { CleanupResult, SystemHealthStatus } from './RuleMaintenanceService';
