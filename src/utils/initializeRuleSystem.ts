/**
 * 初始化规则系统
 * 确保所有服务正确启动和配置
 */

import { exceptionRuleManager } from '../services/ExceptionRuleManager';
import { systemHealthService } from '../services/SystemHealthService';
import { dataIntegrityChecker } from '../services/DataIntegrityChecker';
import { logger } from './logger';

export async function initializeRuleSystem(): Promise<{
  success: boolean;
  message: string;
  healthReport?: any;
}> {
  logger.info('RULE_SYSTEM', '🚀 开始初始化规则系统...');

  try {
    // 1. 初始化主管理器
    logger.debug('RULE_SYSTEM', '1️⃣ 初始化主管理器...');
    await exceptionRuleManager.initialize();

    // 2. 运行健康检查
    logger.debug('RULE_SYSTEM', '2️⃣ 运行系统健康检查...');
    const healthReport = await systemHealthService.performHealthCheck();
    
    logger.info('RULE_SYSTEM', `健康检查结果: ${healthReport.status} (${healthReport.score}/100)`);
    
    if (healthReport.status === 'critical') {
      logger.warn('RULE_SYSTEM', '⚠️ 系统存在严重问题', { recommendations: healthReport.recommendations });
    }

    // 3. 数据完整性检查
    logger.debug('RULE_SYSTEM', '3️⃣ 检查数据完整性...');
    const integrityReport = await dataIntegrityChecker.checkRuleDataIntegrity();
    
    if (integrityReport.issues.length > 0) {
      logger.warn('RULE_SYSTEM', `发现 ${integrityReport.issues.length} 个数据问题`);
      
      // 自动修复
      const autoFixableIssues = integrityReport.issues.filter(issue => issue.autoFixable);
      if (autoFixableIssues.length > 0) {
        logger.info('RULE_SYSTEM', `正在自动修复 ${autoFixableIssues.length} 个问题...`);
        const fixResults = await dataIntegrityChecker.autoFixIssues(autoFixableIssues);
        const successCount = fixResults.filter(r => r.success).length;
        logger.info('RULE_SYSTEM', `✅ 已修复 ${successCount} 个问题`);
      }
    }

    logger.info('RULE_SYSTEM', '🎉 规则系统初始化完成！');
    
    return {
      success: true,
      message: '规则系统初始化成功',
      healthReport
    };

  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('RULE_SYSTEM', '❌ 规则系统初始化失败', undefined, err);
    
    return {
      success: false,
      message: `初始化失败: ${error instanceof Error ? error.message : '未知错误'}`
    };
  }
}
