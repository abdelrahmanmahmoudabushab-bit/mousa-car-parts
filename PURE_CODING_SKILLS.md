# 🧠 Pure Coding & Software Engineering Mastery (Godmode Skill)

This skill dictates the absolute highest standards for pure software engineering, clean code design, algorithm efficiency, defensive error handling, and systematic verification across any codebase.

---

## 💎 1. Clean Code & Architectural Discipline

1. **Single Responsibility & Modularity**:
   - Write small, focused functions that perform exactly one task cleanly.
   - Separate UI rendering logic, state management, and data transformation into distinct decoupled modules.
   - Never write duplicate utility logic; extract reusable helpers into utility modules.

2. **Self-Documenting & Expressive Identifiers**:
   - Variable and function names must convey exact intent (`calculateCartSubtotal`, `isStockAvailable`, `matchProductSearch`).
   - Avoid cryptic abbreviations or generic names (`data`, `temp`, `item2`).

3. **Immutability & Pure Functions**:
   - Never mutate arguments or global state directly. Use pure functions and immutable array/object spread patterns (`[...prev, newItem]`, `{ ...prev, qty: newQty }`).
   - Ensure side effects are explicitly isolated in lifecycle hooks or middleware.

---

## ⚡ 2. High-Performance Execution & Algorithm Optimization

1. **Algorithmic Complexity Control**:
   - Avoid nested `O(n²)` loops over large collections. Use `Map` / `Set` lookups (`O(1)`) for indexing items by ID or key.
   - Memoize expensive computation blocks (`useMemo`, `useCallback`) to avoid redundant re-renders or re-calculations.

2. **Lazy Loading & Code Splitting**:
   - Dynamically load heavy or non-critical modules (`React.lazy()`, dynamic `import()`) to keep initial execution sub-30ms.

3. **Non-Blocking Asynchronous Operations**:
   - Never invoke blocking operations on main UI or event dispatch threads.
   - Use non-blocking `async/await` handling with proper timeout safeguards.

---

## 🛡️ 3. Defensive Error Handling & Empirical Diagnosis

1. **No Silent Swallowing of Exceptions**:
   - Never mask errors by returning dummy fallbacks or wrapping broken logic in silent `try { ... } catch {}` blocks.
   - Log explicit diagnostic context and notify the caller or user appropriately.

2. **Log & Traceback First**:
   - Base all bug diagnoses strictly on empirical log evidence and full stack trace inspection before making edits.

3. **Input Sanitization & Null Checks**:
   - Validate and sanitize all inputs, method arguments, and external API responses before property dereferencing (`data?.items ?? []`).

---

## 🔄 4. State Management & API Contract Safety

1. **Local vs Global State Scoping**:
   - Keep transient UI state (e.g., input typing, modal toggles) local to the component. Reserve global state for persistent session or app data.

2. **Contract Preservation**:
   - When modifying a function signature or API schema, update every call site across the codebase.

3. **Race Condition Prevention**:
   - Handle fast user typing or rapid API triggers with debouncing, cancellation tokens, or request sequencing.

---

## 🧪 5. Empirical Verification Protocol

1. **Zero Guesswork**:
   - Editing a file does NOT equal completing a task.
2. **Execution Check**:
   - Always run production build commands (`npm run build`, `tsc`, or equivalent test suites) to verify syntax and runtime correctness.
3. **Runtime Confirmation**:
   - Confirm layout and functionality visually or via automated browser tests before marking tasks completed.
