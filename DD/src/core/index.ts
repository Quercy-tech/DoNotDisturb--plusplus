/**
 * DoNotDisturb- core: notification routing backbone.
 * Public API. No vscode or external dependencies.
 * @packageDocumentation
 */

// Domain types
export type { Action, NotificationInput, Rule } from "./types.js";

// State
export type { RouterState } from "./state.js";

// Matchers (for OCP: custom conditions and defaults)
export type { MatchCondition } from "./matchers.js";
export {
  sourceMatches,
  containsMatches,
  defaultMatchConditions,
} from "./matchers.js";

// Router
export type { Clock, RouteOptions } from "./router.js";
export { route } from "./router.js";
