/**
 * Core domain types for the notification routing backbone.
 * @module types
 */

/**
 * The action to take for a notification after routing.
 * - "allow": show immediately
 * - "suppress": drop silently
 * - "digest": queue for later (digest)
 */
export type Action = "allow" | "suppress" | "digest";

/**
 * Input describing an incoming notification to be classified.
 */
export interface NotificationInput {
  /** Origin/source of the notification (e.g. extension id, "Git", "Debug"). */
  source: string;
  /** Notification title. */
  title: string;
  /** Notification body text. */
  body: string;
}

/**
 * A routing rule. First rule whose conditions match wins.
 * - source: exact source or "*" for any (case-insensitive for exact).
 * - contains: optional substring in (title + "\\n" + body), case-insensitive.
 *   Trimmed; empty string is treated as "no contains filter" (only source is checked).
 * - action: the Action to return when this rule matches.
 */
export interface Rule {
  /** Source to match: "*" or exact match (case-insensitive). */
  source: string | "*";
  /** Optional substring in title+body (case-insensitive). Empty/whitespace = no filter. */
  contains?: string;
  /** Action to take when this rule matches. */
  action: Action;
}
