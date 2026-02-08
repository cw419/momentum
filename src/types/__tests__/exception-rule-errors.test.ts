import { describe, expect, it } from 'vitest';
import {
  EnhancedExceptionRuleException,
  ExceptionRuleError,
  ExceptionRuleException,
} from '../exception-rule-errors';

describe('types/exception-rule-errors', () => {
  it('builds base ExceptionRuleException with type/details metadata', () => {
    const details = { source: 'unit-test' };
    const error = new ExceptionRuleException(
      ExceptionRuleError.RULE_NOT_FOUND,
      'Rule missing',
      details,
    );

    expect(error.name).toBe('ExceptionRuleException');
    expect(error.type).toBe(ExceptionRuleError.RULE_NOT_FOUND);
    expect(error.message).toBe('Rule missing');
    expect(error.details).toEqual(details);
  });

  it('creates user-friendly and recoverable enhanced errors', () => {
    const userFriendly = EnhancedExceptionRuleException.createUserFriendly(
      ExceptionRuleError.VALIDATION_ERROR,
      'Please fix the form',
      'validation internals',
      { field: 'name' },
    );
    const recoverable = EnhancedExceptionRuleException.createRecoverable(
      ExceptionRuleError.CONCURRENT_MODIFICATION,
      'Conflict detected',
      ['Retry'],
      { id: 'rule-1' },
    );

    expect(userFriendly.userMessage).toBe('Please fix the form');
    expect(userFriendly.recoverable).toBe(true);
    expect(userFriendly.technicalDetails).toEqual({
      technicalMessage: 'validation internals',
    });
    expect(userFriendly.getCategory()).toBe('user_error');

    expect(recoverable.recoverable).toBe(true);
    expect(recoverable.suggestedActions).toEqual(['Retry']);
    expect(recoverable.getCategory()).toBe('system_error');
  });

  it('creates critical enhanced errors and supports fluent setters', () => {
    const critical = EnhancedExceptionRuleException.createCritical(
      ExceptionRuleError.STORAGE_ERROR,
      'database unavailable',
      { op: 'write' },
    )
      .addSuggestedAction('Contact admin')
      .setSeverity('critical')
      .setUserMessage('Storage is down');

    expect(critical.isCritical()).toBe(true);
    expect(critical.isRecoverable()).toBe(false);
    expect(critical.userMessage).toBe('Storage is down');
    expect(critical.suggestedActions).toContain('Contact admin');
    expect(critical.getCategory()).toBe('system_error');
  });

  it('maps error categories across all category branches', () => {
    const cases: Array<[ExceptionRuleError, string]> = [
      [ExceptionRuleError.DUPLICATE_RULE_NAME, 'user_error'],
      [ExceptionRuleError.OPERATION_TIMEOUT, 'system_error'],
      [ExceptionRuleError.DATA_INTEGRITY_ERROR, 'data_error'],
      [ExceptionRuleError.NETWORK_ERROR, 'network_error'],
      [ExceptionRuleError.RULE_NOT_FOUND, 'system_error'],
    ];

    for (const [type, category] of cases) {
      const error = new EnhancedExceptionRuleException(type, 'msg');
      expect(error.getCategory()).toBe(category);
    }
  });

  it('serializes and deserializes enhanced errors through JSON safely', () => {
    const original = new EnhancedExceptionRuleException(
      ExceptionRuleError.PERMISSION_DENIED,
      'not allowed',
      { scope: 'global' },
      true,
      ['Request access'],
      'high',
      'Permission denied',
      { trace: 'abc' },
    );
    original.stack = 'stack-line-1';

    const json = original.toJSON();
    const restored = EnhancedExceptionRuleException.fromJSON(json);

    expect(restored.type).toBe(ExceptionRuleError.PERMISSION_DENIED);
    expect(restored.message).toBe('not allowed');
    expect(restored.context).toEqual({ scope: 'global' });
    expect(restored.userMessage).toBe('Permission denied');
    expect(restored.technicalDetails).toEqual({ trace: 'abc' });
    expect(restored.stack).toBe('stack-line-1');
  });
});
