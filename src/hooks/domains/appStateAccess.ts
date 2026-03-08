import type { AppState } from '../../types';

type AppStateReader = () => AppState;

interface AppStateReadAccess {
  state?: AppState;
  getState?: AppStateReader;
}

export function resolveAppStateReader({
  state,
  getState,
}: AppStateReadAccess): AppStateReader {
  if (getState) {
    return getState;
  }

  if (state) {
    return () => state;
  }

  return () => {
    throw new Error('App state access requires either state or getState.');
  };
}
