# Momentum - Claude Instructions

## CRITICAL: Router First

**For ANY question about this project, ALWAYS invoke `momentum-router` skill FIRST.**

This is NON-NEGOTIABLE. Do NOT:
- Answer from memory without invoking skill
- Skip to specialized skills without checking router
- Use WebSearch for project-specific questions

### Workflow

```
User Question
     |
[1] Invoke: Skill(momentum-router)
     |
[2] Read router content -> Identify category (Layer 1/2/3)
     |
[3] Invoke specialized skill if needed
     |
[4] Answer based on skill knowledge
```

---

## Routing Table

| User Intent | Route To |
|-------------|----------|
| React hooks, components, useState, useEffect | react-patterns |
| Supabase query, auth, RLS, realtime | supabase-ops |
| Tauri invoke, command, Rust backend | tauri-command |
| Test, vitest, testing-library | vitest-testing |
| Architecture, layer, domain, infra | architecture-review |
| useDomain hooks, business logic | domain-hooks |
| Result, error, retry, recovery | error-handling |
| Performance, optimize, bundle, slow | performance |
| Web, PWA, Netlify, browser | domain-web |
| Desktop, Tauri window, native | domain-tauri |
| Mobile, iOS, Android, touch | domain-mobile |
| Chain, Focus, Betting, Session, CTDP | domain-ctdp |

---

## Three-Layer Cognitive Model

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

## Project Overview

**Momentum** is a psychology-driven focus application with hybrid architecture:

| Platform | Technology |
|----------|------------|
| Web | React 18 + TypeScript + Vite + Supabase |
| Desktop | Tauri (Rust backend) |
| Mobile | Tauri Mobile (iOS/Android) |

### Tech Stack

- **Frontend**: React 18.3 + TypeScript 5.9 + Vite 7.3
- **Styling**: Tailwind CSS 3.4
- **Database**: Supabase (PostgreSQL + RLS)
- **Testing**: Vitest + React Testing Library
- **Architecture**: Three-layer + Domain-Driven Design

---

## Build & Development Commands

```bash
npm run dev              # Start development server
npm run build            # Production build
npm run lint             # Run ESLint
npm run typecheck        # TypeScript type checking

# Testing
npm test                 # Smoke tests (CI-safe)
npm run test:all         # ALL tests
npm run test:integration # Integration tests
npm run test:db          # Database tests
npm run test:performance # Performance tests
```

---

## Architecture Rules

### Three-Layer Separation

1. **UI Layer** (`src/components/`, `src/app/`)
   - Pure presentational components
   - Never directly access Supabase
   - Use `useStorage()` for data operations

2. **Domain Layer** (`src/hooks/domains/`)
   - Business logic in domain hooks
   - Handle state mutations and side effects

3. **Infrastructure Layer** (`src/storage/`, `src/infra/`)
   - `MomentumStorage` interface
   - Two implementations: local + Supabase

### Container/View Pattern

Large components split into:
- Container: state/logic
- View: pure presentation
- Target: <300 lines per file

---

## Code Principles

- **KISS**: Simplest solution that works
- **YAGNI**: Only implement what's needed now
- **DRY**: Abstract only when there's actual duplication
- Use `logger` from `src/utils/logger.ts` (not `console.*`)
- Use `toast` from `src/utils/toast.ts` (not `alert()`)
- Use `Result<T, E>` pattern for error handling

---

## Skills Reference

| Layer | Skills |
|-------|--------|
| Layer 1 | react-patterns, supabase-ops, tauri-command, vitest-testing |
| Layer 2 | architecture-review, domain-hooks, error-handling, performance |
| Layer 3 | domain-web, domain-tauri, domain-mobile, domain-ctdp |

For detailed guidance, see `skills/` directory.
