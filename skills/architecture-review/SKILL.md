---
name: architecture-review
description: "Three-layer architecture compliance, DDD patterns. Triggers: architecture, layer, domain, infra, separation, DDD"
---

# Architecture Review

> **Layer 2: Design Choices**

## Core Question

**Is the dependency direction correct?**

```
UI → Domain → Infrastructure
     (never reverse)
```

---

## Three-Layer Rules

| Layer | Can Access | Cannot Access |
|-------|------------|---------------|
| UI | Domain | Infrastructure |
| Domain | Infrastructure | - |
| Infrastructure | - | UI, Domain |

---

## Directory Mapping

| Layer | Directory |
|-------|-----------|
| UI | `src/components/`, `src/app/` |
| Domain | `src/hooks/domains/`, `src/services/` |
| Infrastructure | `src/storage/`, `src/infra/` |

---

## Violation Examples

```typescript
// WRONG: UI accessing Supabase directly
import { supabase } from '../lib/supabase';

// CORRECT: UI using storage hook
const storage = useStorage();
```

---

## Related Skills

| When | See |
|------|-----|
| Domain hooks | domain-hooks |
| Supabase ops | supabase-ops |
