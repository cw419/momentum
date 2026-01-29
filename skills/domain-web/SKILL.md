---
name: domain-web
description: "Web platform constraints, PWA, Netlify deployment. Triggers: web, PWA, Netlify, browser, deploy"
---

# Domain: Web

> **Layer 3: Domain Constraints**

## Platform Constraints

| Constraint | Impact |
|------------|--------|
| Browser sandbox | No native file access |
| PWA | Offline support needed |
| Netlify | Static hosting, edge functions |

---

## Storage Mode

```typescript
const storage = useStorage();
if (storage.kind === 'supabase') {
  // Web mode: cloud storage
}
```

---

## Related Skills

| When | See |
|------|-----|
| Supabase ops | supabase-ops |
| Architecture | architecture-review |
