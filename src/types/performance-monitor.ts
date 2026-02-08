interface SyncStats {
  subscriberCount: number;
  dataTypes: string[];
  lastSyncTimestamp: number;
  isEnabled: boolean;
}

interface CacheStats {
  cacheSize: number;
  pendingQueries: number;
  cacheKeys: string[];
}

interface ReactPerfStats {
  avgRenderTime: string;
  maxRenderTime: string;
  avgTreeBuildTime: string;
  maxTreeBuildTime: string;
  totalRenders: number;
  totalTreeBuilds: number;
  cacheHitRate: string;
  cacheHits: number;
  cacheMisses: number;
}

interface QueryPerfStats {
  cache: CacheStats;
  react: ReactPerfStats;
}

export interface PerformanceSnapshot {
  sync: SyncStats;
  cache: CacheStats;
  performance: QueryPerfStats;
  timestamp: string;
}
