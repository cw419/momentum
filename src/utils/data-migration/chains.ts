import { storage } from '../storage';
import { getErrorMessage } from '../errorMessage';

export async function updateChainStructure(): Promise<{
  updatedCount: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let updatedCount = 0;

  try {
    const chains = storage.getChains();
    let hasChanges = false;

    const updatedChains = chains.map((chain, index) => {
      try {
        let needsUpdate = false;
        const updatedChain = { ...chain };

        if (updatedChain.auxiliaryStreak === undefined) {
          updatedChain.auxiliaryStreak = 0;
          needsUpdate = true;
        }

        if (updatedChain.auxiliaryFailures === undefined) {
          updatedChain.auxiliaryFailures = 0;
          needsUpdate = true;
        }

        if (updatedChain.auxiliaryExceptions === undefined) {
          updatedChain.auxiliaryExceptions = [];
          needsUpdate = true;
        }

        if (updatedChain.parentId === updatedChain.id) {
          updatedChain.parentId = undefined;
          needsUpdate = true;
        }

        if (needsUpdate) {
          hasChanges = true;
          updatedCount++;
        }

        return updatedChain;
      } catch (error) {
        errors.push(`更新链条 ${index} 时出错: ${getErrorMessage(error)}`);
        return chain;
      }
    });

    if (hasChanges) {
      storage.saveChains(updatedChains);
    }
  } catch (error) {
    errors.push(`更新链条结构时出错: ${getErrorMessage(error)}`);
  }

  return { updatedCount, errors };
}

