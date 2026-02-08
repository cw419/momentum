import { storage } from '../storage';
import { CompletionHistory } from '../../types';
import { getErrorMessage } from '../errorMessage';

export async function migrateCompletionHistory(): Promise<{
  migratedCount: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let migratedCount = 0;

  try {
    const history = storage.getCompletionHistory();
    const chains = storage.getChains();
    let hasChanges = false;

    const updatedHistory = history.map((record, index) => {
      try {
        if (
          record.actualDuration !== undefined &&
          record.isForwardTimed !== undefined
        ) {
          return record;
        }

        const chain = chains.find((c) => c.id === record.chainId);

        const migratedRecord: CompletionHistory = {
          ...record,
          actualDuration: record.duration,
          isForwardTimed: chain?.isDurationless || false,
        };

        hasChanges = true;
        migratedCount++;
        return migratedRecord;
      } catch (error) {
        errors.push(`迁移历史记录 ${index} 时出错: ${getErrorMessage(error)}`);
        return record;
      }
    });

    if (hasChanges) {
      storage.saveCompletionHistory(updatedHistory);
    }
  } catch (error) {
    errors.push(`迁移完成历史记录时出错: ${getErrorMessage(error)}`);
  }

  return { migratedCount, errors };
}
