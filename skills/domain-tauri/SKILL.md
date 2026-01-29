---
name: domain-tauri
description: "Tauri desktop constraints, window management, native features. Triggers: desktop, Tauri, window, native"
---

# Domain: Tauri Desktop

> **Layer 3: Domain Constraints**

## Platform Constraints

| Constraint | Impact |
|------------|--------|
| Native access | File system, notifications |
| Window management | Multi-window support |
| Offline first | Local storage priority |

---

## Tauri Commands

```typescript
import { invoke } from '@tauri-apps/api/core';

// Call Rust backend
const result = await invoke('command_name', { arg });
```

---

## Related Skills

| When | See |
|------|-----|
| Tauri commands | tauri-command |
| Architecture | architecture-review |
