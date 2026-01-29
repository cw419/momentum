---
name: error-handling
description: "Result<T,E> pattern, error recovery, retry logic. Triggers: Result, error, retry, recovery, exception"
---

# Error Handling

> **Layer 2: Design Choices**

## Core Question

**Is this error recoverable?**

- Recoverable → Result<T, E>
- User feedback → toast
- Unrecoverable → throw

---

## Result Pattern

```typescript
import type { Result } from '../domain/result';

type AppError = { code: string; message: string };

async function operation(): Promise<Result<Data, AppError>> {
  return { ok: true, value: data };
  // or
  return { ok: false, error: { code: 'ERR', message: '...' } };
}
```

---

## Toast Usage

```typescript
import { toast } from '../utils/toast';

toast.error('Operation failed');
toast.success('Saved');
```

---

## Related Skills

| When | See |
|------|-----|
| Supabase retry | supabase-ops |
| Domain hooks | domain-hooks |
