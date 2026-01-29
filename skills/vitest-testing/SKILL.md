---
name: vitest-testing
description: "Vitest testing, React Testing Library, mocks. Triggers: test, vitest, testing-library, mock, describe, it, expect"
---

# Vitest Testing

> **Layer 1: Implementation Mechanics**

## Core Question

**What type of test is this?**

Before writing tests:
- Unit, integration, or E2E?
- What needs to be mocked?
- Which config file to use?

---

## Test Commands

| Command | Scope | Config |
|---------|-------|--------|
| `npm test` | CI smoke | `vitest.ci.config.ts` |
| `npm run test:all` | Full suite | `vitest.config.ts` |
| `npm run test:integration` | Integration | `vitest.integration.config.ts` |
| `npm run test:db` | Database | `vitest.db.config.ts` |
| `npm run test:performance` | Performance | `vitest.performance.config.ts` |

---

## File Naming

| Type | Pattern |
|------|---------|
| Unit | `*.test.ts`, `*.spec.ts` |
| Integration | `*.integration.test.ts` |
| Database | `*.db.test.ts` |
| Performance | `*.performance.test.ts` |

---

## React Testing Library

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

test('button click', async () => {
  render(<Button onClick={fn}>Click</Button>);
  await userEvent.click(screen.getByRole('button'));
  expect(fn).toHaveBeenCalled();
});
```

---

## Mock Pattern

```typescript
vi.mock('../lib/supabase', () => ({
  supabase: mockSupabase
}));
```

---

## Related Skills

| When | See |
|------|-----|
| React patterns | react-patterns |
| Architecture | architecture-review |
