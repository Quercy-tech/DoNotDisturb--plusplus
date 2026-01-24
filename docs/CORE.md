# Core: Notification routing backbone

Developer documentation for the DoNotDisturb- **Task** backbone (domain types, routing, matchers, state). No UI, no vscode, no mocks.

---

## 1. Folder / file overview

```
src/
  types.ts    Domain types: Action, NotificationInput, Rule
  state.ts    RouterState (focusMode, snoozeUntil)
  matchers.ts Match conditions: sourceMatches, containsMatches, defaultMatchConditions
  router.ts   Pure route(input, state, rules, opts?) → Action
  index.ts    Barrel: public API

docs/
  CORE.md     This file
```

| File | Role |
|------|------|
| **types.ts** | Data shapes only. `Action`, `NotificationInput`, `Rule`. No logic. |
| **state.ts** | `RouterState`: `focusMode`, optional `snoozeUntil` (epoch ms). |
| **matchers.ts** | Composable `MatchCondition` functions. `sourceMatches`, `containsMatches`, and `defaultMatchConditions`. OCP: add new conditions here or in separate modules. |
| **router.ts** | Orchestrates: snooze check → rules (first match) → default. Depends on `MatchCondition[]` and `Clock` (DIP). |
| **index.ts** | Re-exports the public API. |

---

## 2. Public API (from `src/index.ts`)

```ts
// Types
type Action = "allow" | "suppress" | "digest";
interface NotificationInput { source: string; title: string; body: string; }
interface Rule { source: string | "*"; contains?: string; action: Action; }

// State
interface RouterState { focusMode: boolean; snoozeUntil?: number; }

// Matchers
type MatchCondition = (rule: Rule, input: NotificationInput) => boolean;
const sourceMatches: MatchCondition;
const containsMatches: MatchCondition;
const defaultMatchConditions: MatchCondition[];

// Router
type Clock = () => number;
interface RouteOptions { matchConditions?: MatchCondition[]; getNow?: Clock; }
function route(
  input: NotificationInput,
  state: RouterState,
  rules: Rule[],
  opts?: RouteOptions
): Action;
```

---

## 3. How routing works

### Order of evaluation

1. **Snooze**  
   If `state.snoozeUntil` is set and `getNow() < snoozeUntil` → **`"digest"`**.  
   `snoozeUntil` is ignored when `undefined` or when `now >= snoozeUntil`.

2. **Rules (first match wins)**  
   For each `rule` in `rules`:
   - **Source:** `rule.source === "*"` or `rule.source` equals `input.source` (case-insensitive).
   - **Contains:** If `rule.contains` is present and non-empty after trim, `(input.title + "\n" + input.body)` must contain `rule.contains` (case-insensitive). If `rule.contains` is absent or trims to empty, this check is skipped.
   - If both source and contains (when applicable) pass for **all** `matchConditions` → return `rule.action`.

3. **Default**  
   If no rule matches:
   - `state.focusMode === true` → **`"digest"`**
   - else → **`"allow"`**

### Examples

```ts
import { route } from "./index.js";

const rules = [
  { source: "Git", contains: "pull", action: "suppress" },
  { source: "*", action: "digest" },
];

// Git + "pull" in title/body → first rule matches
route(
  { source: "Git", title: "Done", body: "pull finished" },
  { focusMode: false },
  rules
);
// → "suppress"

// Git but no "pull" → first rule fails, second (*) matches
route(
  { source: "Git", title: "Done", body: "push finished" },
  { focusMode: false },
  rules
);
// → "digest"

// Snooze active: ignore rules
route(
  { source: "Git", title: "x", body: "y" },
  { focusMode: false, snoozeUntil: Date.now() + 60_000 },
  rules,
  { getNow: () => Date.now() }
);
// → "digest"

// No rules match, focusMode → digest
route(
  { source: "Other", title: "Hi", body: "x" },
  { focusMode: true },
  []
);
// → "digest"

// No rules match, !focusMode → allow
route(
  { source: "Other", title: "Hi", body: "x" },
  { focusMode: false },
  []
);
// → "allow"
```

### Edge cases

- **`rule.contains`**  
  - `undefined` or `""` or only whitespace after trim → no contains filter; only source (and other conditions) apply.

- **`snoozeUntil`**  
  - `undefined` or not a number → snooze is skipped.  
  - `now >= snoozeUntil` → snooze is skipped.

- **Case**  
  - Source: `rule.source` and `input.source` compared case-insensitively.  
  - Contains: `rule.contains` and `title + "\n" + body` compared case-insensitively.

---

## 4. Adding a new match condition (e.g. regex) without changing the router

The router depends only on `MatchCondition[]` and `Clock`. It never references `sourceMatches` or `containsMatches` directly. New behavior is added by new conditions, not by editing `router.ts` (OCP).

### 1. Implement a `MatchCondition`

```ts
import type { MatchCondition, Rule } from "./index.js";

const regexMatches: MatchCondition = (rule, input) => {
  const re = (rule as Rule & { regex?: string }).regex;
  if (!re) return true;
  const text = input.title + "\n" + input.body;
  try {
    return new RegExp(re, "i").test(text);
  } catch {
    return false;
  }
};
```

(You would extend `Rule` in your own types or use a branded Rule if you need a typed `regex` field.)

### 2. Use it in `route`

```ts
import { route, sourceMatches, containsMatches } from "./index.js";

const myConditions = [sourceMatches, containsMatches, regexMatches];

route(input, state, rules, { matchConditions: myConditions });
```

### 3. Optional: extend `Rule` in your layer

In app/extension code, define an extended `Rule` and pass only rules that have `regex` when you use `regexMatches`. The router stays generic and does not need to know about `regex`.

---

## 5. Testing tips

### Inject `getNow` for determinism

```ts
const getNow = () => 1_000_000;

route(
  input,
  { focusMode: false, snoozeUntil: 2_000_000 },
  rules,
  { getNow }
);
// Snooze is active: 1_000_000 < 2_000_000 → "digest"

route(
  input,
  { focusMode: false, snoozeUntil: 500_000 },
  rules,
  { getNow }
);
// Snooze over: 1_000_000 >= 500_000 → normal rule/default logic
```

### Inject `matchConditions` for unit tests

- Use only `sourceMatches` to test source logic in isolation.
- Use a custom condition that always returns `true` or `false` to drive specific branches.

```ts
const alwaysPass: MatchCondition = () => true;
const alwaysFail: MatchCondition = () => false;

route(input, state, [r], { matchConditions: [sourceMatches, alwaysFail] });
// Rule never matches (contains equivalent forced to fail) → default.
```

### Pure `route`

- No globals, no `Date.now()` unless you pass `getNow` (default).
- Same `(input, state, rules, opts)` always gives the same `Action` for the same `getNow` and `matchConditions`.

### Suggested test cases

1. **Snooze:** `snoozeUntil` set, `getNow() < snoozeUntil` → `"digest"`; `getNow() >= snoozeUntil` or `snoozeUntil` undefined → no snooze.
2. **First match:** Two rules that could both match; first in array wins.
3. **Contains:** `contains` absent or `""` → only source; `contains` present and in text → match; not in text → no match.
4. **Case:** `source` and `contains` case-insensitive.
5. **Default:** No rules match, `focusMode` true → `"digest"`; false → `"allow"`.
