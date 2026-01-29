---
name: tauri-command
description: "Tauri frontend-backend communication, invoke, commands. Triggers: tauri, invoke, command, rust, backend, IPC"
---

# Tauri Command

> **Layer 1: Implementation Mechanics**

## Core Question

**Should this logic run in Rust or TypeScript?**

Before implementing:
- Does it need native OS access?
- Is it performance-critical?
- Does it need to work offline?

---

## Invoke Pattern

```typescript
// Frontend: invoke Rust command
import { invoke } from '@tauri-apps/api/core';

const result = await invoke<string>('greet', { name: 'World' });
```

---

## Rust Command

```rust
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}!", name)
}
```

---

## Naming Convention

| TypeScript | Rust |
|------------|------|
| `camelCase` | `snake_case` |
| `getUserData` | `get_user_data` |

---

## Error Handling

```rust
#[tauri::command]
fn risky_operation() -> Result<String, String> {
    // Return Ok or Err
    Ok("success".to_string())
}
```

---

## Related Skills

| When | See |
|------|-----|
| Desktop constraints | domain-tauri |
| Error handling | error-handling |
