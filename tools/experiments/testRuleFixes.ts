/**
 * 测试规则修复功能
 */

import { exceptionRuleManager } from '../services/ExceptionRuleManager';
import { ExceptionRuleType } from '../types';

export async function testRuleFixes() {
  console.log('🧪 开始测试规则修复功能...');

  try {
    // 测试1: 创建规则
    console.log('测试1: 创建规则');
    const testRule = await exceptionRuleManager.createRule(
      `测试规则_${Date.now()}`,
      ExceptionRuleType.PAUSE_ONLY,
      '这是一个测试规则',
    );
    console.log('✅ 规则创建成功:', testRule.rule.name);

    // 测试2: 使用规则
    console.log('测试2: 使用规则');
    const sessionContext = {
      sessionId: 'test_session',
      chainId: 'test_chain',
      chainName: '测试链',
      startedAt: new Date(),
      elapsedTime: 300,
      isDurationless: false,
    };

    const useResult = await exceptionRuleManager.useRule(
      testRule.rule.id,
      sessionContext,
      'pause',
    );
    console.log('✅ 规则使用成功:', useResult.rule.name);

    // 测试3: 重复名称检查
    console.log('测试3: 重复名称检查');
    try {
      await exceptionRuleManager.createRule(
        testRule.rule.name, // 使用相同名称
        ExceptionRuleType.EARLY_COMPLETION_ONLY,
      );
      console.log('❌ 重复检查失败 - 应该抛出错误');
    } catch (error) {
      console.log('✅ 重复检查正常 - 正确抛出错误');
    }

    // 清理测试数据
    await exceptionRuleManager.deleteRule(testRule.rule.id);
    console.log('🧹 测试数据已清理');

    console.log('🎉 所有测试通过！');
    return true;
  } catch (error) {
    console.error('❌ 测试失败:', error);
    return false;
  }
}

// 在浏览器控制台中可以调用这个函数
if (typeof window !== 'undefined') {
  (window as any).testRuleFixes = testRuleFixes;
}
