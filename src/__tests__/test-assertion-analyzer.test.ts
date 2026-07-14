import { describe, expect, it } from 'vitest';
import { analyzeTestSource } from '../../tools/quality/test-assertion-analyzer.mjs';

function rulesFor(content: string, filePath = 'src/Foo.test.ts') {
  return analyzeTestSource({ content, filePath }).map(
    (violation: { rule: string }) => violation.rule,
  );
}

describe('test assertion analyzer', () => {
  it('rejects shared built-in prototype replacement', () => {
    expect(
      rulesFor("vi.spyOn(Array.prototype, 'includes').mockReturnValue(true);"),
    ).toEqual(['no-builtin-prototype-mock']);
  });

  it('detects doMock of a qualified test subject', () => {
    expect(
      rulesFor(
        "vi.doMock('../Foo', () => ({ Foo: vi.fn() }));",
        'src/Foo.integration.test.ts',
      ),
    ).toEqual(['no-direct-sut-mock']);
  });

  it('detects a spy on an instance of the imported test subject', () => {
    expect(
      rulesFor(
        "import { Foo } from './Foo';\nconst subject = new Foo();\nvi.spyOn(subject, 'run').mockReturnValue(1);",
      ),
    ).toEqual(['no-direct-sut-spy']);
  });

  it('rejects assertions whose subject is only a constant expression', () => {
    expect(rulesFor('expect(1 + 1).toBe(3);')).toEqual([
      'no-constant-expect-subject',
    ]);
  });

  it('allows assertions over executed behavior and mocks of real boundaries', () => {
    expect(
      rulesFor(
        "vi.mock('../clock');\nconst result = run();\nexpect(result).toBe(2);",
      ),
    ).toEqual([]);
  });
});
