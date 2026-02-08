export const POINTS_CHANGED_EVENT = 'momentum:points-changed';

export function emitPointsChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(POINTS_CHANGED_EVENT));
}
