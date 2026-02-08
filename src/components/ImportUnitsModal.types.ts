import type { Chain } from '../types';

export interface ImportUnitsModalProps {
  availableUnits: Chain[];
  groupId: string;
  onImport: (
    unitIds: string[],
    groupId: string,
    mode?: 'move' | 'copy',
  ) => void;
  onClose: () => void;
}
