import { ButtonHTMLAttributes, forwardRef } from "react";

export type ButtonVariant = "leather" | "brass" | "paper" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex select-none items-center justify-center gap-2 border font-semibold tracking-wide " +
  "transition-all duration-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brass/60 " +
  "active:translate-y-px active:shadow-pressed disabled:pointer-events-none disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  leather:
    "text-paper-light border-leather-800/70 bg-gradient-to-b from-leather-400 via-leather-500 to-leather-700 shadow-bevel hover:brightness-110",
  brass:
    "text-ink border-brass-dark/70 bg-gradient-to-b from-brass-light via-brass to-brass-dark shadow-bevel hover:brightness-105",
  paper:
    "text-ink border-paper-dark bg-gradient-to-b from-paper-light via-paper to-paper-dark shadow-bevel hover:brightness-105",
  danger:
    "text-paper-light border-blood-dark/80 bg-gradient-to-b from-blood-light to-blood shadow-bevel hover:brightness-110",
};

const sizes: Record<ButtonSize, string> = {
  sm: "rounded-[5px] px-2.5 py-1 text-xs",
  md: "rounded-md px-4 py-2 text-sm",
  lg: "rounded-lg px-6 py-3 text-base",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/**
 * Tactile, physical push-button. Pressing it depresses the face
 * (translate + inset shadow) — the core skeuomorphic interaction.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "leather", size = "md", className = "", ...props }, ref) => (
    <button
      ref={ref}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  )
);
Button.displayName = "Button";
