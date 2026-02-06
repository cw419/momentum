export type HealthStatus = 'healthy' | 'warning' | 'critical';

export interface ComponentHealth {
  name: string;
  status: HealthStatus;
  score: number;
  issues: string[];
  metrics?: Record<string, unknown>;
}

export interface SystemHealthReport {
  status: HealthStatus;
  score: number; // 0-100
  timestamp: Date;
  components: ComponentHealth[];
  recommendations: string[];
  summary: string;
}

export interface QuickHealthCheckResult {
  status: HealthStatus;
  score: number;
  issues: string[];
}

