import type { Chain, CompletionHistory, RSIPMeta, RSIPNode } from '../../types';

import {
  type MomentumExportDataV2,
  toExportedChain,
  toExportedCompletionHistory,
  toExportedRSIPMeta,
  toExportedRSIPNode,
} from './DataTransformers';

export class ExportService {
  createExportData(params: {
    chains: Chain[];
    history?: CompletionHistory[];
    rsipNodes?: RSIPNode[];
    rsipMeta?: RSIPMeta;
    userPreferences?: unknown;
    exceptionRules?: unknown;
  }): MomentumExportDataV2 {
    const {
      chains,
      history,
      rsipNodes,
      rsipMeta,
      userPreferences,
      exceptionRules,
    } = params;

    return {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      chains: chains.map(toExportedChain),
      completionHistory: (history || []).map(toExportedCompletionHistory),
      rsipNodes: rsipNodes ? rsipNodes.map(toExportedRSIPNode) : undefined,
      rsipMeta: rsipMeta ? toExportedRSIPMeta(rsipMeta) : undefined,
      userPreferences,
      exceptionRules,
    };
  }
}
