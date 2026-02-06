import type { ComponentHealth, HealthStatus } from './types';

export function generateSummary(status: HealthStatus, score: number, components: ComponentHealth[]): string {
  const healthyCount = components.filter((c) => c.status === 'healthy').length;
  const warningCount = components.filter((c) => c.status === 'warning').length;
  const criticalCount = components.filter((c) => c.status === 'critical').length;

  let summary = `系统健康分数: ${score}/100。`;

  if (status === 'healthy') {
    summary += ` 系统运行良好，${healthyCount} 个组件正常运行。`;
  } else if (status === 'warning') {
    summary += ` 系统存在一些问题，${warningCount} 个组件需要关注。`;
  } else {
    summary += ` 系统存在严重问题，${criticalCount} 个组件需要紧急修复。`;
  }

  return summary;
}

