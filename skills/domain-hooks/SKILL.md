---
name: domain-hooks
description: "Domain hooks design, business logic encapsulation. Triggers: useDomain, domain hook, business logic, useChainsDomain, useSessionsDomain"
---

# Domain Hooks

> **Layer 2: Design Choices**

## Core Question

**Is this business logic or UI logic?**

- Business logic → Domain hook
- UI logic → Component state

---

## Domain Hook List

| Hook | Purpose |
|------|---------|
| `useChainsDomain` | Task chain CRUD |
| `useSessionsDomain` | Session lifecycle |
| `useBettingDomain` | Betting mode |
| `useRulesDomain` | Exception rules |
| `useRecycleBinDomain` | Soft delete |
| `useRsipDomain` | RSIP protocol |
| `useGroupDomain` | Task groups |
| `usePetDomain` | Virtual pet |
| `useCheckinDomain` | Daily check-in |

---

## Pattern

```typescript
function useChainsDomain() {
  const storage = useStorage();
  const [chains, setChains] = useState<Chain[]>([]);

  const createChain = async (draft: ChainDraft) => {
    const chain = await storage.createChain(draft);
    setChains(prev => [...prev, chain]);
  };

  return { chains, createChain };
}
```

---

## Related Skills

| When | See |
|------|-----|
| Architecture | architecture-review |
| Error handling | error-handling |
| CTDP rules | domain-ctdp |
