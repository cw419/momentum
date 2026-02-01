import type {
  Chain,
  CompletionHistory,
  RSIPMeta,
  RSIPNode,
} from '../../types';
import { buildChainEntriesAndIdMap, buildImportChains, getRawChainsFromPayload } from './import/chains';
import type { ExceptionRuleImportData } from './import/exceptionRules';
import { parseExceptionRulesToImport } from './import/exceptionRules';
import { parseImportHistory } from './import/history';
import { parseImportPayload } from './import/payload';
import { parseImportRsipMeta, parseImportRsipNodes } from './import/rsip';

export interface ImportExportImportOptions {
  preserveStatistics: boolean;
  preserveTimestamps: boolean;
  importCompletionHistory: boolean;
}

interface ParsedImportData {
  chains: Chain[];
  history: CompletionHistory[];
  rsipNodes: RSIPNode[];
  rsipMeta?: RSIPMeta;
  userPreferences?: unknown;
  exceptionRulesToImport: ExceptionRuleImportData[];
}

export class ImportService {
  parseImportData(params: {
    json: string;
    options: ImportExportImportOptions;
    existingRsipNodes?: RSIPNode[];
    tr: (zh: string, en: string) => string;
  }): ParsedImportData {
    const { json, options, existingRsipNodes, tr } = params;

    const parsed = parseImportPayload(json, tr);
    const rawChains = getRawChainsFromPayload(parsed, tr);
    const { chainEntries, idMap } = buildChainEntriesAndIdMap(rawChains, tr);

    const importChains = buildImportChains({
      chainEntries,
      idMap,
      preserveStatistics: Boolean(options.preserveStatistics),
      preserveTimestamps: Boolean(options.preserveTimestamps),
      tr,
    });

    const importHistory = parseImportHistory(
      parsed.completionHistory,
      Boolean(options.importCompletionHistory),
      idMap
    );
    const importedRsipNodes = parseImportRsipNodes(parsed.rsipNodes, existingRsipNodes, tr);
    const rsipMeta = parseImportRsipMeta(parsed.rsipMeta);
    const exceptionRulesToImport = parseExceptionRulesToImport(parsed.exceptionRules);

    return {
      chains: importChains,
      history: importHistory,
      rsipNodes: importedRsipNodes,
      rsipMeta,
      userPreferences: parsed.userPreferences,
      exceptionRulesToImport,
    };
  }
}
