export interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}

export interface TableInfo {
  table_name: string;
  columns: ColumnInfo[];
}

export interface SchemaStatus {
  tablesExist: boolean;
  missingTables: string[];
  missingColumns: Record<string, string[]>;
  extraColumns: Record<string, string[]>;
  migrationStatus: 'complete' | 'partial' | 'missing';
  recommendations: string[];
}

export type SchemaDiff = Pick<SchemaStatus, 'missingTables' | 'missingColumns' | 'extraColumns'>;

export type MigrationStatus = SchemaStatus['migrationStatus'];

