/**
 * Composable rule-matching logic (OCP: add new conditions without changing router).
 * @module matchers
 */

import type { NotificationInput, Rule } from "./types.js";

/**
 * A match condition: (rule, input) => true if this criterion passes.
 * All conditions in a list must pass for a rule to match.
 */
export type MatchCondition = (rule: Rule, input: NotificationInput) => boolean;

/**
 * Source matcher: rule.source === "*" or equals input.source (case-insensitive).
 */
export const sourceMatches: MatchCondition = (rule, input) => {
  if (rule.source === "*") return true;
  return rule.source.toLowerCase() === input.source.toLowerCase();
};

/**
 * Contains matcher: if rule.contains is absent or trims to empty, passes (no filter).
 * Otherwise (title + "\\n" + body) must include rule.contains case-insensitively.
 */
export const containsMatches: MatchCondition = (rule, input) => {
  const needle = rule.contains?.trim();
  if (!needle) return true;
  const haystack = (input.title + "\n" + input.body).toLowerCase();
  return haystack.includes(needle.toLowerCase());
};

/**
 * Default list of match conditions: source, then contains.
 * Router runs these in order; all must pass for a rule to match.
 */
export const defaultMatchConditions: MatchCondition[] = [sourceMatches, containsMatches];
