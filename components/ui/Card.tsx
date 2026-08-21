import { HTMLAttributes } from "react";

export type CardMaterial = "paper" | "leather" | "wood";

const materials: Record<CardMaterial, string> = {
  paper:
    "text-ink border-paper-dark/80 bg-gradient-to-b from-paper-light via-paper to-paper-dark shadow-bevel",
  leather:
    "text-paper-light border-leather-800/80 bg-gradient-to-b from-leather-500 via-leather-600 to-leather-800 shadow-bevel",
  wood:
    "text-ink border-wood-dark/70 bg-gradient-to-b from-wood-light via-wood to-wood-dark shadow-bevel",
};

const textures: Record<CardMaterial, string> = {
  paper: "texture-paper",
  leather: "texture-leather",
  wood: "texture-wood",
};

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  material?: CardMaterial;
  /** Add an inset brass trim frame (like a bordered panel on a desk). */
  framed?: boolean;
}

/**
 * Physical material panel: paper note, leather binder cover or wooden desk
 * surface, each with beveled edges and a real-material grain overlay.
 */
export function Card({
  material = "paper",
  framed = false,
  className = "",
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-panel border p-5 ${materials[material]} ${className}`}
      {...props}
    >
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 opacity-60 ${textures[material]}`}
      />
      {framed && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-1.5 rounded-[0.55rem] border border-brass/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]"
        />
      )}
      <div className="relative">{children}</div>
    </div>
  );
}
