/**
 * 简单测试脚本
 */

import { ExceptionRuleType } from '../types';

export function testBasicFunctionality() {
  console.log('🧪 测试基本功能...');

  // 测试类型枚举
  console.log('ExceptionRuleType.PAUSE_ONLY:', ExceptionRuleType.PAUSE_ONLY);
  console.log(
    'ExceptionRuleType.EARLY_COMPLETION_ONLY:',
    ExceptionRuleType.EARLY_COMPLETION_ONLY,
  );

  // 测试类型检查
  const testType = ExceptionRuleType.PAUSE_ONLY;
  console.log('测试类型:', testType, typeof testType);
  console.log(
    '类型有效性:',
    Object.values(ExceptionRuleType).includes(testType),
  );

  return true;
}

// 暴露到全局
if (typeof window !== 'undefined') {
  (window as any).testBasicFunctionality = testBasicFunctionality;

  // 自动运行
  setTimeout(() => {
    testBasicFunctionality();
  }, 1000);
}
