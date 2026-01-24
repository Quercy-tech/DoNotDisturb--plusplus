"use strict";
/**
 * Pure routing logic: classifies a notification into "allow" | "suppress" | "digest".
 * Depends on abstractions (matchers, clock) for testability (DIP).
 * @module router
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.route = route;
const matchers_js_1 = require("./matchers.js");
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
function route(input, state, rules, opts = {}) {
    const getNow = opts.getNow ?? (() => Date.now());
    const conditions = opts.matchConditions ?? matchers_js_1.defaultMatchConditions;
    // 1) Snooze: if snoozeUntil exists and now < snoozeUntil → digest
    const snoozeUntil = state.snoozeUntil;
    if (snoozeUntil != null && typeof snoozeUntil === "number" && getNow() < snoozeUntil) {
        return "digest";
    }
    // 2) First matching rule wins
    for (const rule of rules) {
        const allPass = conditions.every((fn) => fn(rule, input));
        if (allPass)
            return rule.action;
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
//# sourceMappingURL=router.js.map