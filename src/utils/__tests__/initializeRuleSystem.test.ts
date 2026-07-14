import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IntegrityIssue } from '../../services/integrity/IntegrityTypes';
import type { SystemHealthReport } from '../../services/SystemHealthService';

const serviceMocks = vi.hoisted(() => ({
  initialize: vi.fn(),
  performHealthCheck: vi.fn(),
  checkRuleDataIntegrity: vi.fn(),
  autoFixIssues: vi.fn(),
}));

const loggerMocks = vi.hoisted(() => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

vi.mock('../../services/ExceptionRuleManager', () => ({
  exceptionRuleManager: { initialize: serviceMocks.initialize },
}));
vi.mock('../../services/SystemHealthService', () => ({
  systemHealthService: {
    performHealthCheck: serviceMocks.performHealthCheck,
  },
}));
vi.mock('../../services/DataIntegrityChecker', () => ({
  dataIntegrityChecker: {
    checkRuleDataIntegrity: serviceMocks.checkRuleDataIntegrity,
    autoFixIssues: serviceMocks.autoFixIssues,
  },
}));
vi.mock('../logger', () => ({ logger: loggerMocks }));

import { initializeRuleSystem } from '../initializeRuleSystem';

const healthyReport: SystemHealthReport = {
  status: 'healthy',
  score: 100,
  timestamp: new Date('2026-07-14T00:00:00Z'),
  components: [],
  recommendations: [],
  summary: 'healthy',
};

function integrityIssue(autoFixable: boolean): IntegrityIssue {
  return {
    type: 'missing_id',
    severity: 'warning',
    description: autoFixable ? 'repairable' : 'manual repair',
    affectedItems: ['rule-1'],
    autoFixable,
  };
}

function integrityReport(issues: IntegrityIssue[]) {
  return {
    issues,
    summary: {
      totalIssues: issues.length,
      criticalIssues: 0,
      warningIssues: issues.length,
      infoIssues: 0,
      autoFixableIssues: issues.filter((issue) => issue.autoFixable).length,
    },
    recommendations: [],
  };
}

describe('initializeRuleSystem', () => {
  beforeEach(() => {
    serviceMocks.initialize.mockReset().mockResolvedValue(undefined);
    serviceMocks.performHealthCheck
      .mockReset()
      .mockResolvedValue(healthyReport);
    serviceMocks.checkRuleDataIntegrity
      .mockReset()
      .mockResolvedValue(integrityReport([]));
    serviceMocks.autoFixIssues.mockReset().mockResolvedValue([]);
    Object.values(loggerMocks).forEach((mock) => mock.mockReset());
  });

  it('initializes services in order and returns the actual health report', async () => {
    await expect(initializeRuleSystem()).resolves.toEqual({
      success: true,
      message: '规则系统初始化成功',
      healthReport: healthyReport,
    });

    expect(serviceMocks.initialize).toHaveBeenCalledOnce();
    expect(serviceMocks.performHealthCheck).toHaveBeenCalledOnce();
    expect(serviceMocks.checkRuleDataIntegrity).toHaveBeenCalledOnce();
    expect(serviceMocks.autoFixIssues).not.toHaveBeenCalled();
    expect(serviceMocks.initialize.mock.invocationCallOrder[0]).toBeLessThan(
      serviceMocks.performHealthCheck.mock.invocationCallOrder[0],
    );
    expect(
      serviceMocks.performHealthCheck.mock.invocationCallOrder[0],
    ).toBeLessThan(
      serviceMocks.checkRuleDataIntegrity.mock.invocationCallOrder[0],
    );
  });

  it('repairs only auto-fixable issues and reports a critical health state', async () => {
    const repairable = integrityIssue(true);
    const manual = integrityIssue(false);
    const criticalReport: SystemHealthReport = {
      ...healthyReport,
      status: 'critical',
      score: 35,
      recommendations: ['repair storage'],
    };
    serviceMocks.performHealthCheck.mockResolvedValue(criticalReport);
    serviceMocks.checkRuleDataIntegrity.mockResolvedValue(
      integrityReport([repairable, manual]),
    );
    serviceMocks.autoFixIssues.mockResolvedValue([
      { issueType: repairable.type, success: true, message: 'fixed' },
      { issueType: repairable.type, success: false, message: 'not fixed' },
    ]);

    const result = await initializeRuleSystem();

    expect(result).toEqual({
      success: true,
      message: '规则系统初始化成功',
      healthReport: criticalReport,
    });
    expect(serviceMocks.autoFixIssues).toHaveBeenCalledWith([repairable]);
    expect(loggerMocks.warn).toHaveBeenCalledWith(
      'RULE_SYSTEM',
      '⚠️ 系统存在严重问题',
      { recommendations: ['repair storage'] },
    );
    expect(loggerMocks.info).toHaveBeenCalledWith(
      'RULE_SYSTEM',
      '✅ 已修复 1 个问题',
    );
  });

  it('does not invoke auto-fix when all discovered issues need manual repair', async () => {
    serviceMocks.checkRuleDataIntegrity.mockResolvedValue(
      integrityReport([integrityIssue(false)]),
    );

    const result = await initializeRuleSystem();

    expect(result.success).toBe(true);
    expect(serviceMocks.autoFixIssues).not.toHaveBeenCalled();
  });

  it('stops the pipeline and exposes an initialization error', async () => {
    serviceMocks.initialize.mockRejectedValue(new Error('manager unavailable'));

    await expect(initializeRuleSystem()).resolves.toEqual({
      success: false,
      message: '初始化失败: manager unavailable',
    });
    expect(serviceMocks.performHealthCheck).not.toHaveBeenCalled();
    expect(serviceMocks.checkRuleDataIntegrity).not.toHaveBeenCalled();
    expect(loggerMocks.error).toHaveBeenCalledWith(
      'RULE_SYSTEM',
      '❌ 规则系统初始化失败',
      undefined,
      expect.objectContaining({ message: 'manager unavailable' }),
    );
  });

  it('uses a safe public message when a dependency rejects with a non-Error', async () => {
    serviceMocks.performHealthCheck.mockRejectedValue('offline');

    await expect(initializeRuleSystem()).resolves.toEqual({
      success: false,
      message: '初始化失败: 未知错误',
    });
    expect(serviceMocks.checkRuleDataIntegrity).not.toHaveBeenCalled();
    expect(loggerMocks.error).toHaveBeenCalledWith(
      'RULE_SYSTEM',
      '❌ 规则系统初始化失败',
      undefined,
      expect.objectContaining({ message: 'offline' }),
    );
  });
});
