export type AsyncOrSyncVoid = Promise<void> | void;

export type OperationResult = {
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
};

export interface ConfirmDialogState {
  type: 'restore' | 'delete';
  chainIds: string[];
  chainNames: string[];
}
