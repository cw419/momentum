---
name: react-patterns
description: "React hooks, components, performance optimization. Triggers: useState, useEffect, useCallback, useMemo, component, re-render, props, state"
---

# React Patterns

> **Layer 1: Implementation Mechanics**

## Core Question

**Is this component doing too much?**

Before writing React code:
- Should this be split into Container/View?
- Is state in the right place?
- Are there unnecessary re-renders?

---

## Thinking Prompt

1. **Component responsibility?**
   - UI only → View component
   - State + logic → Container component
   - Shared logic → Custom hook

2. **State location?**
   - Local UI state → useState
   - Domain state → Domain hook
   - Global state → Context

3. **Performance concern?**
   - Expensive calculation → useMemo
   - Callback identity → useCallback
   - Child re-renders → React.memo

---

## Container/View Pattern

```typescript
// Container: state + logic
function ChainEditorContainer() {
  const { chains, updateChain } = useChainsDomain();
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <ChainEditorView
      chains={chains}
      selected={selected}
      onSelect={setSelected}
      onUpdate={updateChain}
    />
  );
}

// View: pure presentation
function ChainEditorView({ chains, selected, onSelect, onUpdate }: Props) {
  return (
    <div>
      {chains.map(chain => (
        <ChainItem key={chain.id} ... />
      ))}
    </div>
  );
}
```

---

## Hook Patterns

| Pattern | When | Example |
|---------|------|---------|
| `useState` | Local UI state | `const [open, setOpen] = useState(false)` |
| `useEffect` | Side effects | Subscriptions, timers |
| `useCallback` | Stable callbacks | Event handlers passed to children |
| `useMemo` | Expensive compute | Filtered/sorted lists |
| `useRef` | Mutable value | DOM refs, previous values |

---

## Anti-Patterns

| Anti-Pattern | Why Bad | Better |
|--------------|---------|--------|
| Props drilling | Hard to maintain | Context or composition |
| useEffect for derived state | Extra renders | useMemo |
| Inline objects in JSX | New reference each render | useMemo or extract |
| Missing deps in useEffect | Stale closures | Include all deps |

---

## Related Skills

| When | See |
|------|-----|
| Domain state management | domain-hooks |
| Architecture decisions | architecture-review |
| Performance issues | performance |
