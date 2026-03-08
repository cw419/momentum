import { describe, expect, test } from 'vitest';
import { parseImportPayload } from '../payload';

describe('import/payload parser', () => {
  test('accepts object payloads and rejects primitive payloads', () => {
    expect(parseImportPayload('{"ok":true}', (zh, en) => en)).toEqual({
      ok: true,
    });
    expect(() => parseImportPayload('[]', (zh, en) => en)).toThrow(
      'Invalid import format: file content is not an object.',
    );
  });
});
