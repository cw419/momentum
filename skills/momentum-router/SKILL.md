---
name: momentum-router
description: "CRITICAL: Use for ALL Momentum project questions. Routes to appropriate skill based on cognitive layer. Triggers: React, Supabase, Tauri, test, architecture, domain, error, performance, chain, session, betting, focus, CTDP"
globs: ["**/*.tsx", "**/*.ts", "src/**/*"]
---

# Momentum Question Router

> **Version:** 1.0.0

## Meta-Cognition Framework

### Core Principle

**Don't answer directly. Trace through the cognitive layers first.**

```
Layer 3: Domain Constraints (WHY)
├── Business rules, platform constraints
├── domain-web, domain-tauri, domain-mobile, domain-ctdp
└── "Why is it designed this way?"

Layer 2: Design Choices (WHAT)
├── Architecture patterns, DDD concepts
├── architecture-review, domain-hooks, error-handling, performance
└── "What pattern should I use?"

Layer 1: Implementation Mechanics (HOW)
├── React hooks, Supabase API, Tauri commands
├── react-patterns, supabase-ops, tauri-command, vitest-testing
└── "How do I implement this?"
```

---

## Routing by Entry Point

| User Signal | Entry Layer | Direction | First Skill |
|-------------|-------------|-----------|-------------|
| React error/question | Layer 1 | Trace UP | react-patterns |
| Supabase query/auth | Layer 1 | Trace UP | supabase-ops |
| Tauri invoke | Layer 1 | Trace UP | tauri-command |
| Test question | Layer 1 | Trace UP | vitest-testing |
| "How to design..." | Layer 2 | Check L3, then DOWN | architecture-review |
| "Best practice..." | Layer 2 | Both directions | domain-hooks |
| Chain/Session/Betting | Layer 3 | Trace DOWN | domain-ctdp |
| Web/Desktop/Mobile | Layer 3 | Trace DOWN | domain-* |

---

## Layer 1 Skills (Implementation)

| Pattern | Route To |
|---------|----------|
| React hooks, useState, useEffect, component | react-patterns |
| Supabase, query, auth, RLS, realtime | supabase-ops |
| Tauri, invoke, command, Rust | tauri-command |
| Test, vitest, testing-library, mock | vitest-testing |

## Layer 2 Skills (Design)

| Pattern | Route To |
|---------|----------|
| Architecture, layer, separation, DDD | architecture-review |
| Domain hook, useDomain, business logic | domain-hooks |
| Result, error, retry, recovery | error-handling |
| Performance, optimize, bundle, slow | performance |

## Layer 3 Skills (Domain)

| Pattern | Route To |
|---------|----------|
| Web, PWA, Netlify, browser | domain-web |
| Desktop, Tauri window, native | domain-tauri |
| Mobile, iOS, Android, touch | domain-mobile |
| Chain, Session, Betting, Focus, CTDP | domain-ctdp |

---

## Dual-Skill Loading

**When domain keywords are present, load BOTH skills:**

| Domain Keywords | L1 Skill | L3 Skill |
|-----------------|----------|----------|
| Chain + React | react-patterns | domain-ctdp |
| Session + Supabase | supabase-ops | domain-ctdp |
| Desktop + invoke | tauri-command | domain-tauri |
| Mobile + touch | react-patterns | domain-mobile |

---

## Priority Order

1. **Identify cognitive layer** (L1/L2/L3)
2. **Load entry skill**
3. **Trace through layers** (UP or DOWN)
4. **Cross-reference skills** as indicated
5. **Answer with reasoning chain**

---

## Related Skills

| When | See |
|------|-----|
| React implementation | react-patterns |
| Supabase operations | supabase-ops |
| Tauri commands | tauri-command |
| Testing | vitest-testing |
| Architecture check | architecture-review |
| Domain hooks design | domain-hooks |
| Error handling | error-handling |
| Performance | performance |
| CTDP business rules | domain-ctdp |
