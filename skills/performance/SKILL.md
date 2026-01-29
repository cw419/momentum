---
name: performance
description: "Performance optimization, bundle analysis, re-render prevention. Triggers: performance, optimize, bundle, slow, re-render"
---

# Performance

> **Layer 2: Design Choices**

## Core Question

**Where is the bottleneck?**

- Render performance → React optimization
- Bundle size → Code splitting
- Network → Caching, retry

---

## React Optimization

| Issue | Solution |
|-------|----------|
| Unnecessary re-renders | `React.memo`, `useMemo` |
| Expensive calculations | `useMemo` |
| Callback identity | `useCallback` |

---

## Bundle Optimization

```bash
npm run build -- --analyze
```

---

## Related Skills

| When | See |
|------|-----|
| React patterns | react-patterns |
| Architecture | architecture-review |
