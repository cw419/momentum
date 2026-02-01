import { ExportService, ImportService } from './import-export';

export type {
  ImportExportImportOptions,
  MomentumExportDataV2,
} from './import-export';

class ImportExportService {
  private readonly exportService = new ExportService();
  private readonly importService = new ImportService();

  createExportData(...args: Parameters<ExportService['createExportData']>) {
    return this.exportService.createExportData(...args);
  }

  parseImportData(...args: Parameters<ImportService['parseImportData']>) {
    return this.importService.parseImportData(...args);
  }
}

export const importExportService = new ImportExportService();
