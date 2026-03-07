import type { RSIPNode, RSIPNodeGroup } from '../../../types';
import type { ReadState, SaveFns } from './types';

interface CreateGroupOperationsParams {
  readState: ReadState;
  saveFns: Pick<SaveFns, 'saveGroups'>;
}

export function createGroupOperations({
  readState,
  saveFns,
}: CreateGroupOperationsParams) {
  const createGroup = async (
    title: string,
    faultTolerance: number,
    emoji?: string,
  ): Promise<RSIPNodeGroup> => {
    const state = readState();
    const nextGroup: RSIPNodeGroup = {
      id: crypto.randomUUID(),
      title: title.trim(),
      faultTolerance: Math.max(0, Math.floor(faultTolerance)),
      emoji,
      createdAt: new Date(),
    };
    const nextGroups = [...(state?.rsipGroups ?? []), nextGroup];
    await saveFns.saveGroups(nextGroups);
    return nextGroup;
  };

  const isGroupAlive = (
    groupId: string,
    nodes?: RSIPNode[],
    groups?: RSIPNodeGroup[],
  ): boolean => {
    const state = readState();
    const allNodes = nodes ?? state?.rsipNodes ?? [];
    const allGroups = groups ?? state?.rsipGroups ?? [];
    const group = allGroups.find((item) => item.id === groupId);
    if (!group) {
      return false;
    }

    const aliveCount = allNodes.filter((item) => item.groupId === groupId).length;
    if (aliveCount === 0) {
      return false;
    }

    return aliveCount > 0 || group.faultTolerance > 0;
  };

  return {
    createGroup,
    isGroupAlive,
  };
}
