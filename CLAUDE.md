# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Tech Stack

React 18 + TypeScript 5.9 + Vite 7 + Tailwind CSS 3.4 + Supabase JS 2. Testing: Vitest 4 + Testing Library + MSW 2. PWA via vite-plugin-pwa. **Desktop/Mobile**: Tauri v2 (Rust backend).

**Node version**: `^20.19.0 || >=22.12.0` (see `.nvmrc` for exact version). **Rust**: stable (for Tauri). License: GPL-3.0-only.

## Build & Development Commands

```bash
npm run dev              # Start development server (Vite)
npm run build            # Production build
npm run format           # Prettier (write)
npm run format:check     # Prettier (check)
npm run lint             # Run ESLint
npm run lint:fix         # ESLint (fix)
npm run typecheck        # TypeScript type checking (tsconfig.app.json)

# CSS / Docs
npm run lint:css         # Stylelint (CSS)
npm run lint:css:fix     # Stylelint (fix)
npm run lint:md          # markdownlint-cli2 (Markdown)
npm run lint:spell       # cspell (code)
npm run lint:spell:docs  # cspell (docs/README/root *.md)

# Smell / Dependency Hygiene
npm run quality:knip       # Unused files/exports/deps
npm run quality:ts-prune   # Unused exports
npm run quality:depcheck   # Unused/missing deps
npm run quality:smell-audit# Bundle reports -> reports/quality/
npm run quality:licenses   # License summary

# Security (local optional; CI runs soft scans)
npm run security:npm-audit  # npm audit (high+)
npm run security:semgrep    # Semgrep (auto-skips if semgrep not installed)
npm run lint:sql            # sqlfluff (auto-skips if sqlfluff not installed)

# Testing
npm test                 # Run smoke tests (CI-safe subset)
npm run test:watch       # Watch mode for smoke tests
npm run test:all         # Run ALL tests (comprehensive)
npm run test:all:watch   # Watch mode for all tests
npm run test:integration # Integration tests only
npm run test:performance # Performance tests only
npm run test:coverage    # Unit + integration coverage for all production TS/TSX
npm run test:mutation:critical # Required mutation gate for critical domain logic

# Run a single test file
npx vitest run src/path/to/file.test.ts
# Run tests matching a pattern
npx vitest run -t "test name pattern"

# Tauri (Desktop/Mobile)
npm run tauri dev            # Tauri 桌面端开发模式
npm run tauri build          # Tauri 生产构建（生成安装包）
npm run tauri icon <path>    # 从源图片生成所有平台图标
```

Notes:

- This repo intentionally uses explicit `npm run ...` scripts (no pre-commit hooks) to keep local iteration unblocked.
- `npm run security:semgrep` requires Semgrep installed (recommended: `pipx install semgrep`).
- `npm run lint:sql` requires SQLFluff installed (recommended: `pipx install sqlfluff`).
- Test configs: `vitest.ci.config.ts` (smoke/CI), `vitest.config.ts` (all), `vitest.integration.config.ts` (30s timeout), `vitest.coverage.config.ts` (unit + integration coverage), `vitest.performance.config.ts` (benchmarks).
- Test file naming: `*.test.ts(x)` (unit), `*.integration.test.ts(x)`, `*.performance.test.ts(x)`.
- Tauri dev requires Rust toolchain (`rustup`). Tauri CLI is installed as npm devDependency (`@tauri-apps/cli`).
- When `TAURI_ENV_PLATFORM` is set (by Tauri CLI), Vite config auto-disables PWA plugin to avoid Service Worker conflicts with WebView.

## Architecture Overview

### Three-Layer Architecture

The codebase follows a clear three-layer separation:

1. **UI Layer** (`src/components/`, `src/app/`)
   - Pure presentational components
   - Never directly access Supabase or storage
   - Use `useStorage()` hook for all data operations

2. **Domain Logic Layer** (`src/domain/`, `src/hooks/domains/`)
   - `src/domain/` — Pure domain logic (no React dependencies): `result.ts`, `pet.ts`, `scheduling.ts`, `betting.ts`, `checkin.ts`, `auth.ts`, `errors.ts`, `userSettings.ts`
   - `src/hooks/domains/` — React integration via domain hooks: `useChainsDomain`, `useSessionsDomain`, `useBettingDomain`, `useRulesDomain`, `useRecycleBinDomain`, `useRsipDomain`, `useGroupDomain`, `useImportExportDomain`, `useCheckinDomain`, `usePetDomain`, `useSafeSaveChains`
   - Domain hooks use `useStorage()` for data access, never directly access Supabase/localStorage

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
- Use `normalizeUnknownError()` from `src/utils/errors/normalizeError.ts` to safely convert unknown caught values to `Error`
- `Result<T, E>` pattern from `src/domain/result.ts` — use `ok(value)` / `err(error)` constructors, check via `result.ok`
- Exception rules use `EnhancedExceptionRuleException` with severity levels and recovery actions

## Quality Gates (CI Enforced)

### Technical Debt Budgets (`npm run quality:debt-gate`)

Hard limits — CI will fail if exceeded:

- `as unknown as` casts: ≤30
- `as Error` casts: ≤10
- Non-null assertions (`!`): ≤70
- jscpd clones: ≤6 blocks, ≤0.3%
- Large files (>300 lines, non-generated): ≤15
- Type coverage: ≥95% (`npm run quality:type-coverage`)

### Test Coverage Thresholds

Statements: 84%, Branches: 75%, Functions: 83%, Lines: 84%.

### ESLint Rules That Block PRs

- `no-console: error` — use `logger` from `src/utils/logger.ts`
- `no-restricted-syntax` — bans `as any` (use `unknown` + narrowing)
- `sonarjs/cognitive-complexity: warn, 15` — keep functions under 15
- `@typescript-eslint/no-unused-vars` — `_` prefix allowed for intentionally unused vars
- `jsx-a11y` — accessibility rules enforced

## Unified Runtime & Migration

### SystemRuntime (`src/services/runtime/SystemRuntime.ts`)

Centralized entry point for cache and monitoring lifecycle:

```typescript
import { systemRuntime } from '@/services/runtime';
systemRuntime.cache.start(); // exceptionRuleCache
systemRuntime.monitoring.start(); // performanceMonitor, layoutStabilityMonitor
```

### MigrationCoordinator (`src/services/migration/MigrationCoordinator.ts`)

Unified migration entry point — coordinates startup, data, and exception rule migrations:

```typescript
import { migrationCoordinator } from '@/services/migration/MigrationCoordinator';
migrationCoordinator.setStorage(storage);
migrationCoordinator.runStartupMigrations();
```

## Key Domain Concepts

**CTDP (Chained Time-Delay Protocol)**: Productivity methodology based on:

- **Sacred Seat Principle**: Specific triggers (e.g., "put on noise-canceling headphones") that start tasks
- **Precedent Principle**: Failed actions either break the chain or become permanent exceptions
- **Linear Time-Delay Principle**: Scheduling system with auxiliary chains for task preparation

## AI Team Assignments

| Task                        | Agent                       | Notes                     |
| --------------------------- | --------------------------- | ------------------------- |
| React component development | `react-component-architect` | Primary for React work    |
| Tailwind styling            | `tailwind-frontend-expert`  | Utility-first CSS         |
| API integration             | `api-architect`             | Supabase integration      |
| Code reviews                | `code-reviewer`             | MANDATORY for PRs         |
| Performance                 | `performance-optimizer`     | MANDATORY before releases |

## Code Principles (Enforced)

- **KISS**: Simplest solution that works
- **YAGNI**: Only implement what's needed now
- **DRY**: Abstract only when there's actual duplication
- **SOLID**: Single responsibility, dependency inversion
- Minimize comments; delete removed code (don't comment it out)
- Prioritize fixing errors before continuing with tasks

## Naming Conventions

### Service/Utility Class Naming

Use consistent suffixes based on the class's primary responsibility:

| Suffix      | Purpose                                    | Examples                                                            |
| ----------- | ------------------------------------------ | ------------------------------------------------------------------- |
| `*Service`  | Business logic, external API interactions  | `BettingService`, `CheckinService`, `SessionService`                |
| `*Manager`  | State management, lifecycle coordination   | `RuleStateManager`, `ErrorRecoveryManager`, `AsyncOperationManager` |
| `*Cache`    | Caching logic, data memoization            | `ExceptionRuleCache`, `CacheCore`                                   |
| `*Monitor`  | Performance metrics, observability         | `PerformanceMonitor`, `LayoutStabilityMonitor`                      |
| `*Storage`  | Data persistence, storage abstraction      | `ExceptionRuleStorage`, `SupabaseStorage`                           |
| `*Handler`  | Event/action processing, user interactions | `EnhancedDuplicationHandler`, `UserFeedbackHandler`                 |
| `*Tracker`  | Usage tracking, analytics                  | `RuleUsageTracker`                                                  |
| `*Detector` | Pattern detection, validation              | `RuleDuplicationDetector`                                           |
| `*Checker`  | Data integrity, validation checks          | `DataIntegrityChecker`                                              |

### File Naming

- **Components**: PascalCase (`ChainDetailView.tsx`)
- **Hooks**: camelCase with `use` prefix (`useChainsDomain.ts`)
- **Utils/Services**: PascalCase for classes, camelCase for instances (`ExceptionRuleCache.ts`, `exceptionRuleCache`)
- **Types**: PascalCase (`CacheTypes.ts`)
- **Tests**: Same name as source file with `.test.ts(x)` suffix

### Directory Structure

```
src/
├── app/                  # Application shell (Container + View)
├── components/           # UI components (kebab-case subdirs)
├── domain/               # Pure domain logic (no React deps)
├── hooks/domains/        # Domain hooks (React integration)
├── services/             # Business services and managers
├── storage/              # Storage abstraction (MomentumStorage interface)
├── infra/storage/supabase/ # Supabase storage implementation
├── i18n/                 # Internationalization (zh-CN / en)
├── types/                # TypeScript type definitions
├── utils/                # Utility functions and classes
│   ├── platform.ts       # Platform detection (web / tauri-desktop / tauri-mobile)
│   ├── tauri-bridge.ts   # Tauri API lazy-loading bridge
│   └── platform-adapters/ # Platform adapters (notifications, window, file)
├── constants/            # Application constants
├── lib/                  # Third-party library wrappers
├── styles/               # Global styles
└── test/                 # Test utilities, setup files, factories

src-tauri/                # Tauri Rust backend
├── Cargo.toml            # Rust dependencies
├── tauri.conf.json       # Tauri app configuration
├── capabilities/         # Permission configs (desktop / mobile)
└── src/
    ├── main.rs           # Desktop entry point
    ├── lib.rs            # Shared library (desktop + mobile)
    └── commands/         # Rust commands (notifications, window, file_ops)
```
