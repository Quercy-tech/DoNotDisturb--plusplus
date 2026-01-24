/**
 * Router state that affects classification (snooze, focus mode).
 * @module state
 */

/**
 * Mutable router state.
 * - focusMode: when true and no rule matches, result is "digest".
 * - snoozeUntil: epoch ms; when now < snoozeUntil, result is forced to "digest"
 *   before any rule evaluation. Absent/undefined means no snooze.
 */
export interface RouterState {
  /** When true, default (no-rule match) is "digest" instead of "allow". */
  focusMode: boolean;
  /** Epoch ms; if now < snoozeUntil, force "digest". Omit when not snoozing. */
  snoozeUntil?: number;
}
