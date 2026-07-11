import type { Chain, ChainType, GroupChain, UnitChain } from '../types';
import {
  parseDateOrUndefined,
  parseTruthyDateOrNow,
  sanitizeStringArray,
  toBooleanWithDefault,
  toNumber,
  toOptionalNumber,
  toStringWithDefault,
} from './primitives';

const UNIT_CHAIN_TYPES: ReadonlySet<ChainType> = new Set([
  'unit',
  'assault',
  'recon',
  'command',
  'special_ops',
  'engineering',
  'quartermaster',
]);

type SerializedChainBase = {
  id: string;
  parentId?: string;
  type?: ChainType | null;
  sortOrder: number;
  name: string;
  trigger: string;
  duration: number;
  description: string;
  currentStreak: number;
  auxiliaryStreak?: number;
  totalCompletions: number;
  totalFailures: number;
  auxiliaryFailures?: number;
  exceptions?: unknown;
  auxiliaryExceptions?: unknown;
  auxiliarySignal?: unknown;
  auxiliaryDuration?: unknown;
  auxiliaryCompletionTrigger?: unknown;
  timeLimitExceptions?: unknown;
  isDurationless?: unknown;
  minimumDuration?: unknown;
  taskRepeatCount?: unknown;
  deletedAt?: string | null;
  createdAt?: string | null;
  lastCompletedAt?: string | null;
};

type SerializedUnitChain = SerializedChainBase & {
  type?: Exclude<ChainType, 'group'> | null;
};

type SerializedGroupChain = SerializedChainBase & {
  type: 'group';
  timeLimitHours?: unknown;
  groupStartedAt?: string | null;
  groupExpiresAt?: string | null;
  isTaskGroup?: unknown;
  groupRepeatCount?: unknown;
};

export type SerializedChain = SerializedUnitChain | SerializedGroupChain;

function getCommonChainFields(raw: SerializedChainBase) {
  return {
    id: raw.id,
    name: raw.name,
    parentId: raw.parentId,
    sortOrder: toNumber(raw.sortOrder, 0),
    trigger: toStringWithDefault(raw.trigger, ''),
    duration: toNumber(raw.duration, 45),
    description: toStringWithDefault(raw.description, ''),
    currentStreak: toNumber(raw.currentStreak, 0),
    auxiliaryStreak: toNumber(raw.auxiliaryStreak, 0),
    totalCompletions: toNumber(raw.totalCompletions, 0),
    totalFailures: toNumber(raw.totalFailures, 0),
    auxiliaryFailures: toNumber(raw.auxiliaryFailures, 0),
    exceptions: sanitizeStringArray(raw.exceptions),
    auxiliaryExceptions: sanitizeStringArray(raw.auxiliaryExceptions),
    auxiliarySignal: toStringWithDefault(raw.auxiliarySignal, ''),
    auxiliaryDuration: toNumber(raw.auxiliaryDuration, 15),
    auxiliaryCompletionTrigger: toStringWithDefault(
      raw.auxiliaryCompletionTrigger,
      '',
    ),
    timeLimitExceptions: sanitizeStringArray(raw.timeLimitExceptions),
    isDurationless: toBooleanWithDefault(raw.isDurationless, false),
    minimumDuration: toOptionalNumber(raw.minimumDuration),
    taskRepeatCount: toOptionalNumber(raw.taskRepeatCount),
    deletedAt:
      raw.deletedAt == null
        ? null
        : (parseDateOrUndefined(raw.deletedAt) ?? null),
    createdAt: parseTruthyDateOrNow(raw.createdAt),
    lastCompletedAt: parseDateOrUndefined(raw.lastCompletedAt),
  };
}

function getUnitChainType(
  type: ChainType | null | undefined,
): UnitChain['type'] {
  return type != null && UNIT_CHAIN_TYPES.has(type)
    ? (type as UnitChain['type'])
    : 'unit';
}

export function decodeChain(raw: SerializedChain): Chain {
  const common = getCommonChainFields(raw);

  if (raw.type === 'group') {
    const result = {
      ...common,
      type: 'group',
      timeLimitHours: toOptionalNumber(raw.timeLimitHours),
      groupStartedAt: parseDateOrUndefined(raw.groupStartedAt),
      groupExpiresAt: parseDateOrUndefined(raw.groupExpiresAt),
      isTaskGroup:
        raw.isTaskGroup == null ? undefined : Boolean(raw.isTaskGroup),
      groupRepeatCount: toOptionalNumber(raw.groupRepeatCount),
    } satisfies GroupChain;
    return result;
  }

  const result = {
    ...common,
    type: getUnitChainType(raw.type),
  } satisfies UnitChain;
  return result;
}
