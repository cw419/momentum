---
name: supabase-ops
description: "Supabase database operations, auth, RLS, realtime. Triggers: supabase, query, insert, update, delete, auth, RLS, realtime, rpc"
---

# Supabase Operations

> **Layer 1: Implementation Mechanics**

## Core Question

**Is this operation going through the storage layer?**

Before writing Supabase code:
- Am I using `MomentumStorage` interface?
- Is RLS properly configured?
- Do I need retry logic?

---

## Storage Access Pattern

```typescript
// CORRECT: Through storage interface
const storage = useStorage();
const chains = await storage.getChains();

// WRONG: Direct Supabase access in UI
import { supabase } from '../lib/supabase';
const { data } = await supabase.from('chains').select();
```

---

## Key Files

| File | Purpose |
|------|---------|
| `src/storage/MomentumStorage.ts` | Storage interface |
| `src/infra/storage/supabase/SupabaseStorage.ts` | Main implementation |
| `src/infra/storage/supabase/mappers.ts` | Data mapping |
| `src/infra/storage/supabase/retry.ts` | Retry logic |

---

## Mapper Pattern

```typescript
// DB row → Domain model
function mapChainFromDb(row: DbChain): Chain {
  return {
    id: row.id,
    name: row.name,
    type: row.type as ChainType,
    // ...
  };
}

// Domain model → DB row
function mapChainToDb(chain: Chain): DbChain {
  return {
    id: chain.id,
    name: chain.name,
    type: chain.type,
    // ...
  };
}
```

---

## RLS Rules

```sql
-- User-scoped tables must enforce auth
CREATE POLICY "Users can only access own data"
ON chains FOR ALL
USING (auth.uid() = user_id);
```

---

## Retry Pattern

```typescript
import { withRetry } from './retry';

const result = await withRetry(
  () => supabase.from('chains').select(),
  { maxAttempts: 3, delay: 1000 }
);
```

---

## Related Skills

| When | See |
|------|-----|
| Architecture decisions | architecture-review |
| Error handling | error-handling |
| CTDP business rules | domain-ctdp |
