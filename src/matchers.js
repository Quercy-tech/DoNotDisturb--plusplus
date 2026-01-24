"use strict";
/**
 * Composable rule-matching logic (OCP: add new conditions without changing router).
 * @module matchers
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultMatchConditions = exports.containsMatches = exports.sourceMatches = void 0;
/**
 * Source matcher: rule.source === "*" or equals input.source (case-insensitive).
 */
const sourceMatches = (rule, input) => {
    if (rule.source === "*")
        return true;
    return rule.source.toLowerCase() === input.source.toLowerCase();
};
exports.sourceMatches = sourceMatches;
/**
 * Contains matcher: if rule.contains is absent or trims to empty, passes (no filter).
 * Otherwise (title + "\\n" + body) must include rule.contains case-insensitively.
 */
const containsMatches = (rule, input) => {
    const needle = rule.contains?.trim();
    if (!needle)
        return true;
    const haystack = (input.title + "\n" + input.body).toLowerCase();
    return haystack.includes(needle.toLowerCase());
};
exports.containsMatches = containsMatches;
/**
 * Default list of match conditions: source, then contains.
 * Router runs these in order; all must pass for a rule to match.
 */
exports.defaultMatchConditions = [exports.sourceMatches, exports.containsMatches];
//# sourceMappingURL=matchers.js.map