export const LOCAL_STORAGE_KEYS = {
  // UI Preferences
  THEME: 'theme',
  LANGUAGE: 'language',
  NOTIFICATIONS_ENABLED: 'notifications_enabled',

  // Ephemeral UI State
  RSIP_CANVAS_STATE: 'momentum:rsip-canvas-state',
  AUTO_RESUME: 'momentum_auto_resume',

  // Service Caches
  TIMER_PREFIX: 'momentum_timer_',
  EXCEPTION_RULES: 'momentum_exception_rules',
  EXCEPTION_RULES_USAGE: 'momentum_rule_usage_records',
  EXCEPTION_RULES_MIGRATION: 'momentum_exception_rules_migration',
  TASK_TIME_STATS: 'momentum_task_time_stats',
} as const;

