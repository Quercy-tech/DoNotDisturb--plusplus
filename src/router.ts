/**
 * Pure routing logic: classifies a notification into "allow" | "suppress" | "digest".
 * Depends on abstractions (matchers, clock) for testability (DIP).
 * @module router
 */

import type { Action, NotificationInput, Rule } from "./types.js";
import type { RouterState } from "./state.js";
import type { MatchCondition } from "./matchers.js";
import { defaultMatchConditions } from "./matchers.js";

/**
 * Clock function returning current time as epoch ms. Injected for deterministic tests (DIP).
 */
export type Clock = () => number;

/**
 * Options for the router. All optional; defaults for matchers and clock are applied.
 */
export interface RouteOptions {
  /** Match conditions; all must pass for a rule to match. Default: source + contains. */
  matchConditions?: MatchCondition[];
  /** Clock for "now". Default: Date.now. */
  getNow?: Clock;
}

/**
 * Classifies a notification into an Action using state and rules.
 *
 * Behavior:
 * 1. If state.snoozeUntil is set and getNow() < snoozeUntil → "digest"
 * 2. Else, for each rule in order: if source matches and contains matches (when given) → rule.action
 * 3. If no rule matches: focusMode ? "digest" : "allow"
 *
 * @param input - The notification to classify
 * @param state - focusMode and optional snoozeUntil
 * @param rules - Ordered list; first match wins
 * @param opts - Optional matchers and clock (for tests)
 * @returns "allow" | "suppress" | "digest"
 */
export function route(
  input: NotificationInput,
  state: RouterState,
  rules: Rule[],
  opts: RouteOptions = {}
): Action {
  const getNow: Clock = opts.getNow ?? (() => Date.now());
  const conditions: MatchCondition[] = opts.matchConditions ?? defaultMatchConditions;

  // 1) Snooze: if snoozeUntil exists and now < snoozeUntil → digest
  const snoozeUntil = state.snoozeUntil;
  if (snoozeUntil != null && typeof snoozeUntil === "number" && getNow() < snoozeUntil) {
    return "digest";
  }

  // 2) First matching rule wins
  for (const rule of rules) {
    const allPass = conditions.every((fn) => fn(rule, input));
    if (allPass) return rule.action;
  }

  // 3) No match: focusMode → digest, else allow
  return state.focusMode ? "digest" : "allow";
}

// --- Self-check (commented out): example calls and expected outputs ---
/*
// Helpers for self-check (inline):
const getNow = () => 1000;
const rules: Rule[] = [
  { source: "Git", contains: "pull", action: "suppress" },
  { source: "*", action: "digest" },
];

route(
  { source: "Git", title: "Done", body: "pull finished" },
  { focusMode: false },
  rules,
  { getNow }
);
// Expected: "suppress" (Git + "pull" in body)

route(
  { source: "Git", title: "Done", body: "push finished" },
  { focusMode: false },
  rules,
  { getNow }
);
// Expected: "digest" (second rule: source "*", no contains)

route(
  { source: "Debug", title: "Breakpoint", body: "hit" },
  { focusMode: true },
  rules,
  { getNow }
);
// Expected: "digest" (second rule: "*" matches)

route(
  { source: "Other", title: "Hi", body: "x" },
  { focusMode: true },
  [],
  { getNow }
);
// Expected: "digest" (no rules, focusMode=true)

route(
  { source: "Other", title: "Hi", body: "x" },
  { focusMode: false, snoozeUntil: 2000 },
  rules,
  { getNow }
);
// Expected: "digest" (snooze: 1000 < 2000)
*/
