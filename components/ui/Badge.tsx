import { HTMLAttributes } from "react";

export type BadgeTone =
  | "applied"
  | "screening"
  | "interview"
  | "offer"
  | "rejected"
  | "ghosted"
  | "neutral";

const tones: Record<BadgeTone, string> = {
  applied: "bg-gradient-to-b from-brass-light to-brass text-ink border-brass-dark/60",
  screening: "bg-gradient-to-b from-leather-300 to-leather-500 text-paper-light border-leather-700/60",
  interview: "bg-gradient-to-b from-moss-light to-moss text-paper-light border-moss-dark/70",
  offer: "bg-gradient-to-b from-moss to-moss-light text-ink border-moss-dark/70",
  rejected: "bg-gradient-to-b from-blood-light to-blood text-paper-light border-blood-dark/70",
  ghosted: "bg-gradient-to-b from-ink/60 to-ink/70 text-paper-light border-ink/80",
  neutral: "bg-gradient-to-b from-paper-light to-paper-dark text-ink border-paper-dark",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  /** Show the little embossed status dot. */
  dot?: boolean;
}

/** Beveled status pill, one per kanban stage (applied → ghosted). */
export function Badge({
  tone = "neutral",
  dot = true,
  className = "",
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold shadow-bevel-sm ${tones[tone]} ${className}`}
      {...props}
    >
      {dot && <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  );
}
