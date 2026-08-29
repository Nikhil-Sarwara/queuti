import { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Optional hover lift effect (shadow-2 + subtle translateY). */
  hoverable?: boolean;
}

/**
 * Simple, flat card. Surface background, border, shadow-1, radius-lg.
 * No textures, no gradients, no bevels.
 */
export function Card({
  hoverable = false,
  className = "",
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={`bg-surface border border-border shadow-1 rounded-lg p-6 ${
        hoverable
          ? "transition-all duration-150 ease-out hover:shadow-2 hover:translate-y-[-1px]"
          : ""
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
