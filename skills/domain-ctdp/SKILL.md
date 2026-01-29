---
name: domain-ctdp
description: "CTDP business rules, Chain/Session/Betting/Focus. Triggers: chain, session, betting, focus, CTDP, sacred seat, precedent"
---

# Domain: CTDP

> **Layer 3: Domain Constraints**

## CTDP Methodology

**Chained Time-Delay Protocol** - Psychology-driven focus system.

### Core Principles

| Principle | Description |
|-----------|-------------|
| Sacred Seat | Specific triggers start tasks |
| Precedent | Failed actions become exceptions |
| Linear Time-Delay | Scheduling with auxiliary chains |

---

## Chain Types

| Type | Purpose |
|------|---------|
| `unit` | Basic task unit |
| `group` | Task container |
| `assault` | Learning, experiments |
| `recon` | Information gathering |
| `command` | Planning |
| `special_ops` | Miscellaneous |
| `engineering` | Exercise |
| `quartermaster` | Meal prep |

---

## Domain Hooks

| Hook | Purpose |
|------|---------|
| `useChainsDomain` | Chain CRUD |
| `useSessionsDomain` | Session lifecycle |
| `useBettingDomain` | Betting mode |

---

## Related Skills

| When | See |
|------|-----|
| Domain hooks | domain-hooks |
| Architecture | architecture-review |
