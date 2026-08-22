// Theme persistence helpers (#31, #37). Pure + injectable so they're
// trivially testable; used by app/theme-init.tsx (FOUC bootstrap) and
// components/ThemeToggle.tsx (explicit choice persisted in localStorage).

export type Theme = "paper" | "dark" | "midnight";

export const THEMES: Theme[] = ["paper", "dark", "midnight"];
export const THEME_STORAGE_KEY = "queuti-theme";

export function isTheme(v: unknown): v is Theme {
  return v === "paper" || v === "dark" || v === "midnight";
}

/**
 * Resolve the theme for first paint:
 * - an explicit stored choice wins (validated against the known set)
 * - otherwise honour prefers-color-scheme: dark
 * - otherwise the default "paper"
 */
export function resolveTheme(
  stored: string | null | undefined,
  prefersDark: boolean
): Theme {
  if (isTheme(stored)) return stored;
  return prefersDark ? "dark" : "paper";
}

/** Normalize any stored value (legacy junk / tampered storage → default). */
export function sanitizeStoredTheme(stored: string | null | undefined): Theme | null {
  return isTheme(stored) ? stored : null;
}