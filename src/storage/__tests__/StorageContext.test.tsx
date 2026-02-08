import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StorageProvider } from '../StorageContext';
import { useStorage } from '../useStorage';

const realTimeSyncServiceMock = vi.hoisted(() => ({
  setStorage: vi.fn(),
}));

const recycleBinServiceMock = vi.hoisted(() => ({
  setStorage: vi.fn(),
}));

const migrationServiceMock = vi.hoisted(() => ({
  setStorage: vi.fn(),
}));

const localAdapterMock = vi.hoisted(() => ({
  kind: 'local',
}));

vi.mock('../../utils/supabaseConfig', () => ({
  isSupabaseConfigured: false,
}));

vi.mock('../../services/RealTimeSyncService', () => ({
  realTimeSyncService: realTimeSyncServiceMock,
}));

vi.mock('../../services/RecycleBinService', () => ({
  RecycleBinService: recycleBinServiceMock,
}));

vi.mock('../../services/ExceptionRuleMigration', () => ({
  exceptionRuleMigration: migrationServiceMock,
}));

vi.mock('../localStorageAdapter', () => ({
  localStorageAdapter: localAdapterMock,
}));

vi.mock('../../i18n', () => ({
  useI18n: () => ({ tr: (_zh: string, en: string) => en }),
}));

function StorageConsumer() {
  const storage = useStorage();
  return <div data-testid="storage-kind">{storage.kind}</div>;
}

describe('StorageProvider', () => {
  it('provides explicit storage and wires dependent services', () => {
    const storage = { kind: 'supabase' };

    const { unmount } = render(
      <StorageProvider storage={storage as any}>
        <StorageConsumer />
      </StorageProvider>,
    );

    expect(screen.getByTestId('storage-kind').textContent).toBe('supabase');
    expect(realTimeSyncServiceMock.setStorage).toHaveBeenCalledWith(storage);
    expect(recycleBinServiceMock.setStorage).toHaveBeenCalledWith(storage);
    expect(migrationServiceMock.setStorage).toHaveBeenCalledWith(storage);

    unmount();

    expect(realTimeSyncServiceMock.setStorage).toHaveBeenCalledWith(null);
    expect(recycleBinServiceMock.setStorage).toHaveBeenCalledWith(null);
    expect(migrationServiceMock.setStorage).toHaveBeenCalledWith(null);
  });

  it('falls back to local storage adapter when no storage is provided', () => {
    render(
      <StorageProvider>
        <StorageConsumer />
      </StorageProvider>,
    );

    expect(screen.getByTestId('storage-kind').textContent).toBe('local');
  });
});
