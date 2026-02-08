export function isLayoutShiftEntry(
  entry: PerformanceEntry,
): entry is LayoutShift {
  if (entry.entryType !== 'layout-shift') return false;
  const candidate = entry as Partial<LayoutShift>;
  return (
    typeof candidate.value === 'number' &&
    typeof candidate.hadRecentInput === 'boolean' &&
    Array.isArray(candidate.sources)
  );
}
