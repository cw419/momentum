import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PetState } from '../../types/pet';
import { createUnitChain } from '../../test/factories';
import { localStorageAdapter } from '../localStorageAdapter';

const storageUtilsMock = vi.hoisted(() => ({
  getChains: vi.fn(async () => []),
  getPetState: vi.fn(async () => null),
  savePetState: vi.fn(async () => undefined),
  clearCache: vi.fn(),
}));

vi.mock('../../utils/storage', () => ({
  storage: storageUtilsMock,
}));

function createPetState(overrides: Partial<PetState> = {}): PetState {
  const now = new Date('2026-02-06T10:00:00.000Z');
  return {
    id: overrides.id ?? 'pet-1',
    name: overrides.name ?? 'Momo',
    hunger: overrides.hunger ?? 20,
    happiness: overrides.happiness ?? 80,
    health: overrides.health ?? 90,
    level: overrides.level ?? 2,
    experience: overrides.experience ?? 20,
    stage: overrides.stage ?? 'baby',
    createdAt: overrides.createdAt ?? now,
    lastFedAt: overrides.lastFedAt ?? now,
    lastInteractedAt: overrides.lastInteractedAt ?? now,
    lastDecayCalculatedAt: overrides.lastDecayCalculatedAt ?? now,
    isVisible: overrides.isVisible ?? true,
    isMinimized: overrides.isMinimized ?? false,
    position: overrides.position ?? { x: 80, y: 80 },
    minimizedPosition: overrides.minimizedPosition ?? { x: 92, y: 2 },
  };
}

describe('localStorageAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delegate chain and pet methods to local storage utils', async () => {
    const chains = [createUnitChain({ id: 'chain-1', name: 'Chain 1' })];
    const pet = createPetState();

    storageUtilsMock.getChains.mockResolvedValueOnce(chains);
    storageUtilsMock.getPetState.mockResolvedValueOnce(pet);

    await expect(localStorageAdapter.getChains()).resolves.toEqual(chains);
    await expect(localStorageAdapter.getPetState()).resolves.toEqual(pet);

    await localStorageAdapter.savePetState(pet);
    localStorageAdapter.clearCache();

    expect(storageUtilsMock.getChains).toHaveBeenCalledTimes(1);
    expect(storageUtilsMock.getPetState).toHaveBeenCalledTimes(1);
    expect(storageUtilsMock.savePetState).toHaveBeenCalledWith(pet);
    expect(storageUtilsMock.clearCache).toHaveBeenCalledTimes(1);
  });

  it('should return NOT_SUPPORTED for auth, user settings, betting, and checkin methods', async () => {
    const signInResult = await localStorageAdapter.signIn('user@example.com', 'password');
    const settingsResult = await localStorageAdapter.getGamblingSettings();
    const betResult = await localStorageAdapter.placeBet({
      session_id: 'session-1',
      bet_amount: 1,
    });
    const checkinResult = await localStorageAdapter.performDailyCheckin();

    expect(signInResult.ok).toBe(false);
    expect(settingsResult.ok).toBe(false);
    expect(betResult.ok).toBe(false);
    expect(checkinResult.ok).toBe(false);

    if (!signInResult.ok) {
      expect(signInResult.error.code).toBe('NOT_SUPPORTED');
      expect(signInResult.error.message).toContain('Auth is not supported');
    }
    if (!settingsResult.ok) {
      expect(settingsResult.error.code).toBe('NOT_SUPPORTED');
      expect(settingsResult.error.message).toContain('User settings are not supported');
    }
    if (!betResult.ok) {
      expect(betResult.error.code).toBe('NOT_SUPPORTED');
      expect(betResult.error.message).toContain('Betting is not supported');
    }
    if (!checkinResult.ok) {
      expect(checkinResult.error.code).toBe('NOT_SUPPORTED');
      expect(checkinResult.error.message).toContain('Daily check-in is not supported');
    }
  });

  it('should return local-mode auth defaults for supported auth helpers', async () => {
    const currentUserResult = await localStorageAdapter.getCurrentUser();
    const authenticatedResult = await localStorageAdapter.isUserAuthenticated();
    const waitResult = await localStorageAdapter.waitForAuthentication();
    const subscriptionResult = localStorageAdapter.onAuthStateChange(vi.fn());

    expect(currentUserResult).toEqual({ ok: true, value: null });
    expect(authenticatedResult).toEqual({ ok: true, value: false });
    expect(waitResult).toEqual({
      ok: true,
      value: { user: null, isAuthenticated: false },
    });
    expect(subscriptionResult.ok).toBe(true);

    if (subscriptionResult.ok) {
      expect(typeof subscriptionResult.value).toBe('function');
      subscriptionResult.value();
    }
  });
});
