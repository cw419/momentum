import { LOCAL_STORAGE_KEYS } from './keys';

export function getExceptionRules(): string | null {
  try {
    return localStorage.getItem(LOCAL_STORAGE_KEYS.EXCEPTION_RULES);
  } catch {
    return null;
  }
}

export function setExceptionRules(data: string): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEYS.EXCEPTION_RULES, data);
  } catch {
    // ignore quota errors
  }
}

export function getExceptionRulesUsage(): string | null {
  try {
    return localStorage.getItem(LOCAL_STORAGE_KEYS.EXCEPTION_RULES_USAGE);
  } catch {
    return null;
  }
}

export function setExceptionRulesUsage(data: string): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEYS.EXCEPTION_RULES_USAGE, data);
  } catch {
    // ignore quota errors
  }
}

export function getExceptionRulesMigration(): string | null {
  try {
    return localStorage.getItem(LOCAL_STORAGE_KEYS.EXCEPTION_RULES_MIGRATION);
  } catch {
    return null;
  }
}

export function setExceptionRulesMigration(data: string): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEYS.EXCEPTION_RULES_MIGRATION, data);
  } catch {
    // ignore quota errors
  }
}

export function clearExceptionRulesMigration(): void {
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEYS.EXCEPTION_RULES_MIGRATION);
  } catch {
    // ignore errors
  }
}

