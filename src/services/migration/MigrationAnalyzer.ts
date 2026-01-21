/**
 * 迁移分析器
 * 提供迁移建议、验证和报告功能
 */

import type { ExceptionRule } from '../../types';
import type { MigrationInfo, MigrationSuggestions, MigrationValidation } from './migrationTypes';
import {
  LEGACY_MIGRATED_DESCRIPTION_ZH,
  LEGACY_MIGRATED_DESCRIPTION_EN
} from './migrationTypes';
import { MigrationStorage } from './MigrationStorage';
import { exceptionRuleManager } from '../ExceptionRuleManager';
import { logger } from '../../utils/logger';
import { getCurrentLanguage, tr } from '../../utils/runtimeI18n';
import { getSafeErrorDetail, toError, getErrorMessage } from '../../utils/errorMessage';

/**
 * 迁移分析器
 * 负责分析迁移需求、验证结果和生成报告
 */
export class MigrationAnalyzer {
  constructor(private migrationStorage: MigrationStorage) {}

  /**
   * 获取迁移建议
   */
  async getMigrationSuggestions(): Promise<MigrationSuggestions> {
    try {
      const chains = await this.migrationStorage.getLegacyChains();
      const chainsWithExceptions = chains.filter(chain =>
        chain.exceptions && chain.exceptions.length > 0
      );

      const ruleUsage = new Map<string, { count: number; chains: string[] }>();
      let totalRules = 0;

      for (const chain of chainsWithExceptions) {
        for (const exception of chain.exceptions) {
          const ruleName = exception.trim();
          if (ruleName) {
            totalRules++;
            const existing = ruleUsage.get(ruleName);
            if (existing) {
              existing.count++;
              existing.chains.push(chain.name);
            } else {
              ruleUsage.set(ruleName, { count: 1, chains: [chain.name] });
            }
          }
        }
      }

      const uniqueRules = Array.from(ruleUsage.keys());
      const duplicateRules = Array.from(ruleUsage.entries())
        .filter(([, usage]) => usage.count > 1)
        .map(([rule, usage]) => ({ rule, count: usage.count, chains: usage.chains }))
        .sort((a, b) => b.count - a.count);

      const recommendations = this.generateRecommendations(uniqueRules, duplicateRules);

      return {
        totalRules,
        uniqueRules,
        duplicateRules,
        recommendations
      };

    } catch (error) {
      const err = toError(error);
      logger.error('MIGRATION_ANALYZER', '获取迁移建议失败', undefined, err);
      return {
        totalRules: 0,
        uniqueRules: [],
        duplicateRules: [],
        recommendations: [tr('获取迁移建议失败，请检查数据完整性', 'Failed to get migration suggestions. Check data integrity.')]
      };
    }
  }

  /**
   * 生成建议
   */
  private generateRecommendations(
    uniqueRules: string[],
    duplicateRules: Array<{ rule: string; count: number; chains: string[] }>
  ): string[] {
    const recommendations: string[] = [];

    if (duplicateRules.length > 0) {
      recommendations.push(
        tr(
          `发现 ${duplicateRules.length} 个重复使用的规则，迁移后将合并为单个规则`,
          `Found ${duplicateRules.length} duplicated rule(s); duplicates will be merged after migration`
        )
      );
    }

    if (uniqueRules.length > 20) {
      recommendations.push(
        tr(
          '规则数量较多，建议迁移后进行整理和分类',
          'Many rules detected; consider organizing and categorizing them after migration'
        )
      );
    }

    const commonPatterns = uniqueRules.filter(rule =>
      ['上厕所', '喝水', '休息', '接电话', '查看消息'].some(pattern =>
        rule.includes(pattern)
      )
    );

    if (commonPatterns.length > 0) {
      recommendations.push(
        tr(
          `发现 ${commonPatterns.length} 个常见模式的规则，建议统一命名规范`,
          `Found ${commonPatterns.length} common-pattern rule(s); consider standardizing naming`
        )
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        tr('数据结构良好，可以直接进行迁移', 'Data looks good; you can migrate directly')
      );
    }

    return recommendations;
  }

  /**
   * 验证迁移结果
   */
  async validateMigration(): Promise<MigrationValidation> {
    try {
      const issues: string[] = [];

      const migrationInfo = this.migrationStorage.getMigrationInfo();
      if (!migrationInfo) {
        issues.push(tr('缺少迁移记录', 'Missing migration record'));
      }

      const allRules = await exceptionRuleManager.getAllRules();
      const migratedRules = this.filterMigratedRules(allRules, migrationInfo);
      const activeRules = allRules.filter(rule => rule.isActive);

      if (migrationInfo && migratedRules.length !== migrationInfo.totalRules) {
        issues.push(
          tr(
            `迁移规则数量不匹配：期望 ${migrationInfo.totalRules}，实际 ${migratedRules.length}`,
            `Migrated rule count mismatch: expected ${migrationInfo.totalRules}, got ${migratedRules.length}`
          )
        );
      }

      for (const rule of migratedRules) {
        if (!rule.name || !rule.type) {
          issues.push(tr(`规则 ${rule.id} 数据不完整`, `Rule ${rule.id} data is incomplete`));
        }
      }

      return {
        isValid: issues.length === 0,
        issues,
        statistics: {
          totalRules: allRules.length,
          migratedRules: migratedRules.length,
          activeRules: activeRules.length
        }
      };

    } catch (error) {
      const currentLanguage = getCurrentLanguage();
      return {
        isValid: false,
        issues: [
          (() => {
            if (error instanceof Error) {
              const safe = getSafeErrorDetail(error.message, currentLanguage);
              return safe ?? tr('验证过程中发生错误，请查看控制台', 'Validation error occurred. Check console for details.');
            }
            return tr('未知错误', 'Unknown error');
          })()
        ],
        statistics: {
          totalRules: 0,
          migratedRules: 0,
          activeRules: 0
        }
      };
    }
  }

  /**
   * 过滤迁移的规则
   */
  filterMigratedRules(allRules: ExceptionRule[], migrationInfo: MigrationInfo | null): ExceptionRule[] {
    if (migrationInfo?.createdRuleIds?.length) {
      return allRules.filter(rule => migrationInfo.createdRuleIds!.includes(rule.id));
    }
    return allRules.filter(rule =>
      rule.description === LEGACY_MIGRATED_DESCRIPTION_ZH ||
      rule.description === LEGACY_MIGRATED_DESCRIPTION_EN
    );
  }

  /**
   * 创建迁移报告
   */
  async generateMigrationReport(): Promise<string> {
    try {
      const migrationInfo = this.migrationStorage.getMigrationInfo();
      const validation = await this.validateMigration();
      const suggestions = await this.getMigrationSuggestions();

      const report = {
        title: tr('例外规则迁移报告', 'Exception Rule Migration Report'),
        generatedAt: new Date().toISOString(),
        migrationInfo,
        validation,
        suggestions,
        summary: {
          migrationCompleted: !!migrationInfo,
          validationPassed: validation.isValid,
          totalIssues: validation.issues.length,
          recommendations: suggestions.recommendations.length
        }
      };

      return JSON.stringify(report, null, 2);
    } catch (error) {
      return JSON.stringify({
        title: tr('例外规则迁移报告', 'Exception Rule Migration Report'),
        generatedAt: new Date().toISOString(),
        error: getErrorMessage(error)
      }, null, 2);
    }
  }
}
