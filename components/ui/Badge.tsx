import { HTMLAttributes } from "react";
import { STATUS_TONE_CLS } from "@/lib/tones";

export type BadgeTone =
  | "applied"
  | "screening"
  | "interview"
  | "offer"
  | "rejected"
  | "ghosted"
  | "neutral";

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
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold shadow-bevel-sm ${STATUS_TONE_CLS[tone]} ${className}`}
      {...props}
    >
      {dot && <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  );
}