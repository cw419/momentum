import { useCallback, useMemo, useState } from 'react';
import type { ImportUnitsModalProps } from '../ImportUnitsModal.types';

export type ImportMode = 'move' | 'copy';

export function useImportUnitsController({
  availableUnits,
  groupId,
  onImport,
  onClose,
}: ImportUnitsModalProps) {
  const [selectedUnits, setSelectedUnits] = useState<Set<string>>(
    () => new Set(),
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [importMode, setImportMode] = useState<ImportMode>('copy');

  const importableUnits = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase();
    return availableUnits.filter(
      (unit) =>
        unit.type !== 'group' &&
        !unit.parentId &&
        unit.name.toLocaleLowerCase().includes(normalizedSearch),
    );
  }, [availableUnits, searchTerm]);

  const toggleUnit = useCallback((unitId: string) => {
    setSelectedUnits((current) => {
      const next = new Set(current);
      if (next.has(unitId)) next.delete(unitId);
      else next.add(unitId);
      return next;
    });
  }, []);

  const submit = useCallback(() => {
    if (selectedUnits.size === 0) return;
    onImport([...selectedUnits], groupId, importMode);
    onClose();
  }, [groupId, importMode, onClose, onImport, selectedUnits]);

  return {
    importableUnits,
    selectedUnits,
    searchTerm,
    importMode,
    setSearchTerm,
    setImportMode,
    toggleUnit,
    submit,
  };
}
