import { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Optional hover lift effect (shadow-2 + subtle translateY). */
  hoverable?: boolean;
  /** Elevation level: 0 = flat, 1 = default shadow, 2 = hover/prominent, 3 = modal/top-level. */
  elevation?: 0 | 1 | 2 | 3;
  /** Inset variant — recessed surface for nested content. */
  inset?: boolean;
}

const elevationCls: Record<number, string> = {
  0: "shadow-none",
  1: "shadow-1",
  2: "shadow-2",
  3: "shadow-3",
};

export function Card({
  hoverable = false,
  elevation = 1,
  inset = false,
  className = "",
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={`bg-surface border border-border rounded-lg p-6 ${
        inset ? "bg-elevated border-border-subtle" : ""
      } ${elevationCls[elevation]} ${
        hoverable
          ? "transition-all duration-150 ease-out hover:shadow-2 hover:-translate-y-0.5"
          : ""
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
