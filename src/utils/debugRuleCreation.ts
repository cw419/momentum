/**
 * 调试规则创建问题
 */

import { exceptionRuleManager } from '../services/ExceptionRuleManager';
import { ExceptionRuleType } from '../types';
import { logger } from './logger';

export async function debugRuleCreation() {
  logger.debug('RULE_DEBUG', '🔍 开始调试规则创建...');

  try {
    // 测试基本参数
    const testName = `调试测试_${Date.now()}`;
    const testType = ExceptionRuleType.PAUSE_ONLY;
    
    logger.debug('RULE_DEBUG', '测试参数', { testName, testType, typeOf: typeof testType });
    
    // 直接调用创建方法
    const result = await exceptionRuleManager.createRule(testName, testType, '调试测试规则');
    
    logger.debug('RULE_DEBUG', '✅ 规则创建成功', { result });
    
    // 清理
    await exceptionRuleManager.deleteRule(result.rule.id);
    logger.debug('RULE_DEBUG', '🧹 测试数据已清理');
    
    return true;
    
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('RULE_DEBUG', '❌ 规则创建失败', undefined, err);
    return false;
  }
}

// 暴露到全局
if (typeof window !== 'undefined') {
  (window as any).debugRuleCreation = debugRuleCreation;
}
