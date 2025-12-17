
import { exceptionRuleManager } from '../services/ExceptionRuleManager';
import { logger } from './logger';

const OLD_DEFAULT_RULES = ['喝水', '紧急情况', '任务完成', '特殊情况'];

export const runMigration = async () => {
  try {
    logger.info('MIGRATION', 'Running migration...');
    const allRules = await exceptionRuleManager.getAllRules();
    const rulesToDelete = allRules.filter(rule => OLD_DEFAULT_RULES.includes(rule.name));

    if (rulesToDelete.length > 0) {
      logger.info('MIGRATION', 'Found old default rules to delete', { rules: rulesToDelete.map(r => r.name) });
      for (const rule of rulesToDelete) {
        await exceptionRuleManager.deleteRule(rule.id);
      }
      logger.info('MIGRATION', 'Old default rules deleted successfully.', { count: rulesToDelete.length });
    }

  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('MIGRATION', 'Error running migration', undefined, err);
  }
};
