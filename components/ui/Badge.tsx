import { HTMLAttributes } from "react";

export type BadgeTone =
  | "applied"
  | "screening"
  | "interview"
  | "offer"
  | "rejected"
  | "ghosted"
  | "neutral";

const toneClasses: Record<BadgeTone, string> = {
  applied: "bg-success/10 text-success",
  screening: "bg-warning/10 text-warning",
  interview: "bg-info/10 text-info",
  offer: "bg-success/10 text-success",
  rejected: "bg-error/10 text-error",
  ghosted: "bg-text-secondary/10 text-text-secondary",
  neutral: "bg-elevated text-text-secondary",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  /** Show a small dot indicator next to the label. */
  dot?: boolean;
}

/**
 * Flat pill badge. Low-opacity colored background, no borders or bevels.
 * Small dot indicator uses currentColor at reduced opacity.
 */
export function Badge({
  tone = "neutral",
  dot = true,
  className = "",
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${toneClasses[tone]} ${className}`}
      {...props}
    >
      {dot && (
        <span
          aria-hidden
          className="h-1.5 w-1.5 rounded-full bg-current opacity-60"
        />
      )}
      {children}
    </span>
  );
}
