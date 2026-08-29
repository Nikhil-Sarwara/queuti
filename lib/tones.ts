/**
 * Status tone classes using design-system tokens.
 *
 * Uses low-opacity colored backgrounds with matching text, ensuring
 * WCAG AA contrast in both light and dark themes.
 */

export const STATUS_TONE_CLS: Record<string, string> = {
  applied: "bg-success/10 text-success",
  screening: "bg-warning/10 text-warning",
  interview: "bg-info/10 text-info",
  offer: "bg-success/10 text-success",
  rejected: "bg-error/10 text-error",
  ghosted: "bg-text-secondary/10 text-text-secondary",
  neutral: "bg-elevated text-text-secondary",
};
