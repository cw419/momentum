# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev              # Start development server (Vite)
npm run build            # Production build
npm run lint             # Run ESLint
npm run typecheck        # TypeScript type checking (tsconfig.app.json)

# Testing
npm test                 # Run smoke tests (CI-safe subset)
npm run test:watch       # Watch mode for smoke tests
npm run test:all         # Run ALL tests (comprehensive)
npm run test:all:watch   # Watch mode for all tests
npm run test:integration # Integration tests only
npm run test:db          # Database tests only
npm run test:performance # Performance tests only
npm run test:coverage    # Coverage report
```

## Architecture Overview

### Three-Layer Architecture

The codebase follows a clear three-layer separation:

1. **UI Layer** (`src/components/`, `src/app/`)
   - Pure presentational components
   - Never directly access Supabase or storage
   - Use `useStorage()` hook for all data operations

2. **Domain Logic Layer** (`src/hooks/domains/`)
   - Business logic encapsulated in domain hooks
   - `useChainsDomain`, `useSessionsDomain`, `useBettingDomain`, `useRulesDomain`, `useRecycleBinDomain`, `useRsipDomain`, `useGroupDomain`, `useImportExportDomain`, `useCheckinDomain`, `usePetDomain`, `useSafeSaveChains`
   - Handle state mutations and side effects

3. **Infrastructure Layer** (`src/storage/`, `src/infra/storage/supabase/`)
   - `MomentumStorage` interface defines the storage contract
   - Two implementations: `localStorageAdapter` (offline) and `SupabaseStorage` (cloud)
   - Use `storage.kind` ('local' | 'supabase') to check storage mode

### Container + View Pattern

Large components follow a Container/View split:
- `AppShellContainer.tsx` + `AppShellView.tsx`
- `FocusModeContainer.tsx` + `FocusModeView.tsx`
- `ChainEditorContainer.tsx` + `ChainEditorView.tsx`

Container handles state/logic; View is pure presentation. Target: <300 lines per file.

### Type System

Key types in `src/types/index.ts`:
- **Chain**: Discriminated union with `UnitChain | GroupChain`
- **ChainType**: `'unit' | 'group' | 'assault' | 'recon' | 'command' | 'special_ops' | 'engineering' | 'quartermaster'`
- **ChainDraft**: For form handling (uses `DistributiveOmit` to preserve discriminated union)

When modifying chains, always handle by `type` branch to avoid spreading discriminated union incorrectly.

### Global Services & Lifecycle

Services with explicit `start()`/`stop()` lifecycle (managed in `AppShellContainer.tsx`):
- `forwardTimerManager` - Forward timer functionality
- `exceptionRuleCache` - Rule caching
- `ruleStateManager` - Rule state management
- `performanceDashboard`, `performanceMonitor` - Dev-only metrics

### Environment & Logging

- Use `src/utils/env.ts` for environment checks (`isDev`, `isProd`, `isTest`, `isNonProd`)
- Never use `process.env.NODE_ENV` directly in src/
- Use `logger` from `src/utils/logger.ts` instead of `console.*`
- ESLint enforces `no-console: error` (only logger.ts is exempt)

### Error Handling

- Use `toast` from `src/utils/toast.ts` instead of `alert()`
- Exception rules use `EnhancedExceptionRuleException` with severity levels and recovery actions
- `Result<T, E>` pattern from `src/domain/result.ts` for auth/betting/checkin operations

## Key Domain Concepts

**CTDP (Chained Time-Delay Protocol)**: Productivity methodology based on:
- **Sacred Seat Principle**: Specific triggers (e.g., "put on noise-canceling headphones") that start tasks
- **Precedent Principle**: Failed actions either break the chain or become permanent exceptions
- **Linear Time-Delay Principle**: Scheduling system with auxiliary chains for task preparation

## AI Team Assignments

| Task | Agent | Notes |
|------|-------|-------|
| React component development | `react-component-architect` | Primary for React work |
| Tailwind styling | `tailwind-frontend-expert` | Utility-first CSS |
| API integration | `api-architect` | Supabase integration |
| Code reviews | `code-reviewer` | MANDATORY for PRs |
| Performance | `performance-optimizer` | MANDATORY before releases |

## Code Principles (Enforced)

- **KISS**: Simplest solution that works
- **YAGNI**: Only implement what's needed now
- **DRY**: Abstract only when there's actual duplication
- **SOLID**: Single responsibility, dependency inversion
- Minimize comments; delete removed code (don't comment it out)
- Prioritize fixing errors before continuing with tasks
