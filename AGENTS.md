# Momentum - Agent Instructions

> For OpenAI Codex and compatible agents

## Quick Start

```bash
npm install              # Install dependencies
npm run dev              # Start dev server
npm run typecheck        # TypeScript check
npm run lint             # ESLint
npm test                 # Smoke tests (CI-safe)
npm run test:all         # Full test suite
```

## Project Overview

**Momentum** is a psychology-driven focus application (CTDP methodology).

| Platform | Technology |
|----------|------------|
| Web | React 18 + TypeScript + Vite + Supabase |
| Desktop | Tauri (Rust backend) |
| Mobile | Tauri Mobile (iOS/Android) |

## Architecture

### Three-Layer Structure

```
UI Layer (src/components/, src/app/)
    ↓ useStorage()
Domain Layer (src/hooks/domains/)
    ↓ MomentumStorage interface
Infrastructure Layer (src/storage/, src/infra/)
```

### Key Directories

| Directory | Purpose |
|-----------|---------|
| `src/components/` | React UI components |
| `src/hooks/domains/` | Domain hooks (business logic) |
| `src/services/` | Business services |
| `src/storage/` | Storage interface |
| `src/infra/storage/supabase/` | Supabase implementation |
| `src/types/` | TypeScript types |

## Domain Hooks

| Hook | Purpose |
|------|---------|
| `useChainsDomain` | Task chain CRUD |
| `useSessionsDomain` | Session lifecycle |
| `useBettingDomain` | Betting mode logic |
| `useRulesDomain` | Exception rules |
| `useRecycleBinDomain` | Soft delete |
| `useRsipDomain` | RSIP protocol |
| `useGroupDomain` | Task groups |
| `usePetDomain` | Virtual pet system |
| `useCheckinDomain` | Daily check-in |

## Key Patterns

### Result<T, E> Error Handling

```typescript
import type { Result } from '../domain/result';

async function operation(): Promise<Result<Data, AppError>> {
  // Return { ok: true, value } or { ok: false, error }
}
```

### Storage Access

```typescript
const storage = useStorage();
if (storage.kind === 'supabase') {
  // Cloud-specific logic
}
```

### Container/View Split

```
ComponentContainer.tsx  // State + logic
ComponentView.tsx       // Pure presentation
```

## Code Style

- Use `logger` (not `console.*`)
- Use `toast` (not `alert()`)
- Use `isDev`/`isProd` from `src/utils/env.ts`
- Target: <300 lines per file

## Testing

| Command | Scope |
|---------|-------|
| `npm test` | CI smoke tests |
| `npm run test:all` | Full suite |
| `npm run test:integration` | Integration |
| `npm run test:db` | Database |
| `npm run test:performance` | Performance |

## Skills Reference

See `skills/` directory for detailed guidance on:
- react-patterns, supabase-ops, tauri-command, vitest-testing
- architecture-review, domain-hooks, error-handling, performance
- domain-web, domain-tauri, domain-mobile, domain-ctdp
