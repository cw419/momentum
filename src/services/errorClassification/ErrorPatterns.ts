/**
 * 错误模式定义
 * 包含各种错误类型的模式配置
 */

import { ExceptionRuleError } from '../../types';
import { ErrorPattern } from './types';

export function createErrorPatterns(): Map<ExceptionRuleError, ErrorPattern> {
  const patterns = new Map<ExceptionRuleError, ErrorPattern>();

  patterns.set(ExceptionRuleError.RULE_NOT_FOUND, {
    type: ExceptionRuleError.RULE_NOT_FOUND,
    keywords: ['不存在', 'ID', '缺失'],
    classification: {
      category: 'data_error',
      severity: 'medium',
      priority: 70,
      recoverable: true,
      userFriendly: true,
      requiresImmedateAction: false
    },
    commonCauses: [
      '规则被意外删除',
      '数据同步问题',
      '临时规则创建失败',
      '缓存不一致'
    ],
    recommendedActions: [
      '创建新规则',
      '选择现有规则',
      '检查数据完整性',
      '刷新规则列表'
    ]
  });

  patterns.set(ExceptionRuleError.DUPLICATE_RULE_NAME, {
    type: ExceptionRuleError.DUPLICATE_RULE_NAME,
    keywords: ['重复', '已存在', '名称'],
    classification: {
      category: 'user_error',
      severity: 'low',
      priority: 30,
      recoverable: true,
      userFriendly: true,
      requiresImmedateAction: false
    },
    commonCauses: [
      '用户输入了已存在的规则名称',
      '规则同步导致重复',
      '导入数据包含重复项'
    ],
    recommendedActions: [
      '使用现有规则',
      '修改规则名称',
      '合并重复规则'
    ]
  });

  patterns.set(ExceptionRuleError.RULE_TYPE_MISMATCH, {
    type: ExceptionRuleError.RULE_TYPE_MISMATCH,
    keywords: ['类型', '不匹配', '操作'],
    classification: {
      category: 'user_error',
      severity: 'medium',
      priority: 50,
      recoverable: true,
      userFriendly: true,
      requiresImmedateAction: false
    },
    commonCauses: [
      '选择了错误类型的规则',
      '规则类型设置错误',
      '操作类型识别错误'
    ],
    recommendedActions: [
      '选择正确类型的规则',
      '创建匹配类型的规则',
      '修改规则类型'
    ]
  });

  patterns.set(ExceptionRuleError.STORAGE_ERROR, {
    type: ExceptionRuleError.STORAGE_ERROR,
    keywords: ['存储', '保存', '数据库'],
    classification: {
      category: 'system_error',
      severity: 'high',
      priority: 80,
      recoverable: true,
      userFriendly: false,
      requiresImmedateAction: true
    },
    commonCauses: [
      '磁盘空间不足',
      '数据库连接问题',
      '权限不足',
      '数据损坏'
    ],
    recommendedActions: [
      '检查存储空间',
      '重试操作',
      '检查数据完整性',
      '联系技术支持'
    ]
  });

  patterns.set(ExceptionRuleError.DATA_INTEGRITY_ERROR, {
    type: ExceptionRuleError.DATA_INTEGRITY_ERROR,
    keywords: ['完整性', '数据', '损坏'],
    classification: {
      category: 'data_error',
      severity: 'high',
      priority: 85,
      recoverable: true,
      userFriendly: false,
      requiresImmedateAction: true
    },
    commonCauses: [
      '数据文件损坏',
      '并发修改冲突',
      '系统异常关闭',
      '版本不兼容'
    ],
    recommendedActions: [
      '运行数据修复',
      '从备份恢复',
      '重建数据索引',
      '联系技术支持'
    ]
  });

  patterns.set(ExceptionRuleError.NETWORK_ERROR, {
    type: ExceptionRuleError.NETWORK_ERROR,
    keywords: ['网络', '连接', '超时'],
    classification: {
      category: 'network_error',
      severity: 'medium',
      priority: 60,
      recoverable: true,
      userFriendly: true,
      requiresImmedateAction: false
    },
    commonCauses: [
      '网络连接不稳定',
      '服务器响应超时',
      '防火墙阻止',
      'DNS解析问题'
    ],
    recommendedActions: [
      '检查网络连接',
      '重试操作',
      '切换网络',
      '联系网络管理员'
    ]
  });

  return patterns;
}
