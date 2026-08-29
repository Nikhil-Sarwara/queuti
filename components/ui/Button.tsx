import { ButtonHTMLAttributes, forwardRef } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex select-none items-center justify-center gap-2 font-medium " +
  "transition-all duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-accent " +
  "hover:translate-y-[-0.5px] hover:shadow-2 active:translate-y-0 active:shadow-1 " +
  "disabled:pointer-events-none disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-white border border-accent hover:bg-accent-hover active:bg-accent-hover",
  secondary:
    "bg-transparent text-text-primary border border-border hover:bg-elevated hover:border-border-subtle",
  ghost:
    "bg-transparent text-text-secondary border border-transparent hover:bg-elevated hover:text-text-primary",
  danger:
    "bg-error text-white border border-error hover:bg-error/90 active:bg-error/80",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 rounded-md px-2.5 text-xs",
  md: "h-10 rounded-lg px-4 text-sm",
  lg: "h-12 rounded-lg px-6 text-base",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/**
 * Clean, flat button. Hover lifts with shadow + subtle translateY.
 * Active depresses back down. Focus ring uses accent color.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", ...props }, ref) => (
    <button
      ref={ref}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  )
);
Button.displayName = "Button";
