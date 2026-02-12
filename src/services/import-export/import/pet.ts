import type { PetStage, PetState } from '../../../types/pet';
import {
  isRecord,
  parseTruthyDateOrNow,
  toNumber,
} from './coercions';
import { generateId } from './id';

const PET_STAGES: PetStage[] = ['egg', 'baby', 'child', 'teen', 'adult', 'elder'];

function parsePetStage(value: unknown): PetStage {
  if (typeof value === 'string' && PET_STAGES.includes(value as PetStage)) {
    return value as PetStage;
  }
  return 'egg';
}

function parsePosition(
  value: unknown,
  fallback: { x: number; y: number },
): { x: number; y: number } {
  if (!isRecord(value)) return fallback;
  const x = toNumber(value.x, Number.NaN);
  const y = toNumber(value.y, Number.NaN);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return fallback;
  return { x, y };
}

export function parseImportPetState(raw: unknown): PetState | undefined {
  if (!isRecord(raw)) return undefined;

  return {
    id: typeof raw.id === 'string' && raw.id.length > 0 ? raw.id : generateId('pet'),
    name: typeof raw.name === 'string' && raw.name.length > 0 ? raw.name : 'Pet',
    hunger: toNumber(raw.hunger, 50),
    happiness: toNumber(raw.happiness, 50),
    health: toNumber(raw.health, 100),
    level: Math.max(1, Math.floor(toNumber(raw.level, 1))),
    experience: Math.max(0, Math.floor(toNumber(raw.experience, 0))),
    stage: parsePetStage(raw.stage),
    createdAt: parseTruthyDateOrNow(raw.createdAt),
    lastFedAt: parseTruthyDateOrNow(raw.lastFedAt),
    lastInteractedAt: parseTruthyDateOrNow(raw.lastInteractedAt),
    lastDecayCalculatedAt: parseTruthyDateOrNow(raw.lastDecayCalculatedAt),
    isVisible: raw.isVisible != null ? Boolean(raw.isVisible) : true,
    isMinimized: raw.isMinimized != null ? Boolean(raw.isMinimized) : false,
    position: parsePosition(raw.position, { x: 80, y: 80 }),
    minimizedPosition: parsePosition(raw.minimizedPosition, { x: 92, y: 2 }),
  };
}

