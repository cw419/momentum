/**
 * 快速修复脚本
 * 修复现有的规则数据问题
 */

import { exceptionRuleStorage } from '../services/ExceptionRuleStorage';
import { ExceptionRuleType } from '../types';

export async function quickFixRules(): Promise<{
  fixed: number;
  issues: string[];
}> {
  console.log('🔧 开始快速修复规则数据...');

  let fixed = 0;
  const issues: string[] = [];

  try {
    // 获取所有规则
    const rules = await exceptionRuleStorage.getRules();
    console.log(`发现 ${rules.length} 个规则`);

    for (const rule of rules) {
      let needsUpdate = false;
      const updates: any = {};

      // 修复缺失的类型
      if (!rule.type) {
        updates.type = ExceptionRuleType.PAUSE_ONLY; // 默认类型
        needsUpdate = true;
        issues.push(`规则 "${rule.name}" 缺少类型，已设置为暂停类型`);
      }

      // 修复缺失的创建时间
      if (!rule.createdAt) {
        updates.createdAt = new Date();
        needsUpdate = true;
        issues.push(`规则 "${rule.name}" 缺少创建时间，已设置为当前时间`);
      }

      // 修复无效的使用计数
      if (typeof rule.usageCount !== 'number' || rule.usageCount < 0) {
        updates.usageCount = 0;
        needsUpdate = true;
        issues.push(`规则 "${rule.name}" 使用计数无效，已重置为0`);
      }

      // 确保isActive字段存在
      if (typeof rule.isActive !== 'boolean') {
        updates.isActive = true;
        needsUpdate = true;
        issues.push(`规则 "${rule.name}" 缺少激活状态，已设置为激活`);
      }

      // 应用更新
      if (needsUpdate) {
        try {
          await exceptionRuleStorage.updateRule(rule.id, updates);
          fixed++;
          console.log(`✅ 已修复规则: ${rule.name}`);
        } catch (error) {
          console.error(`❌ 修复规则失败: ${rule.name}`, error);
          issues.push(
            `修复规则 "${rule.name}" 失败: ${error instanceof Error ? error.message : '未知错误'}`,
          );
        }
      }
    }

    console.log(`🎉 快速修复完成，修复了 ${fixed} 个规则`);

    return { fixed, issues };
  } catch (error) {
    console.error('❌ 快速修复失败:', error);
    issues.push(
      `快速修复失败: ${error instanceof Error ? error.message : '未知错误'}`,
    );
    return { fixed, issues };
  }
}

// 暴露到全局作用域
if (typeof window !== 'undefined') {
  (window as any).quickFixRules = quickFixRules;
}

// 自动运行快速修复
setTimeout(() => {
  quickFixRules().then((result) => {
    if (result.fixed > 0) {
      console.log(`🔧 自动修复了 ${result.fixed} 个规则问题`);
    }
    if (result.issues.length > 0) {
      console.log('修复过程中的问题:', result.issues);
    }
  });
}, 2000); // 延迟2秒执行，确保其他初始化完成
