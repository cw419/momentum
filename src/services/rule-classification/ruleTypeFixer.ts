import { ExceptionRuleType } from '../../types';
import { exceptionRuleStorage } from '../ExceptionRuleStorage';

export async function fixRuleTypeIssues(ruleId: string): Promise<{
  fixed: boolean;
  issues: string[];
  actions: string[];
}> {
  try {
    const rule = await exceptionRuleStorage.getRuleById(ruleId);
    const issues: string[] = [];
    const actions: string[] = [];
    let fixed = false;

    if (!rule) {
      return {
        fixed: false,
        issues: ['规则不存在'],
        actions: ['创建新规则'],
      };
    }

    if (!rule.type) {
      issues.push('规则缺少类型定义');
      rule.type = ExceptionRuleType.PAUSE_ONLY;
      await exceptionRuleStorage.updateRule(ruleId, { type: rule.type });
      actions.push('已设置默认类型为暂停');
      fixed = true;
    } else if (!Object.values(ExceptionRuleType).includes(rule.type)) {
      issues.push(`规则类型无效: ${rule.type}`);
      rule.type = ExceptionRuleType.PAUSE_ONLY;
      await exceptionRuleStorage.updateRule(ruleId, { type: rule.type });
      actions.push('已修复为有效的规则类型');
      fixed = true;
    }

    if (!rule.name || rule.name.trim().length === 0) {
      issues.push('规则名称为空');
      actions.push('需要设置规则名称');
    }

    if (!rule.createdAt) {
      issues.push('缺少创建时间');
      rule.createdAt = new Date();
      await exceptionRuleStorage.updateRule(ruleId, { createdAt: rule.createdAt });
      actions.push('已设置创建时间');
      fixed = true;
    }

    if (typeof rule.usageCount !== 'number' || rule.usageCount < 0) {
      issues.push('使用计数无效');
      rule.usageCount = 0;
      await exceptionRuleStorage.updateRule(ruleId, { usageCount: rule.usageCount });
      actions.push('已重置使用计数');
      fixed = true;
    }

    return { fixed, issues, actions };
  } catch {
    return {
      fixed: false,
      issues: ['修复过程中发生错误'],
      actions: ['需要手动检查规则数据'],
    };
  }
}

