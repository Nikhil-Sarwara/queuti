// Theme persistence helpers (v2). Pure + injectable so they're
// trivially testable; used by app/theme-init.tsx (FOUC bootstrap) and
// components/ThemeToggle.tsx (explicit choice persisted in localStorage).

export type Theme = "light" | "dark";

export const THEMES: Theme[] = ["light", "dark"];
export const THEME_STORAGE_KEY = "queuti-theme";

export function isTheme(v: unknown): v is Theme {
  return v === "light" || v === "dark";
}

/**
 * Resolve the theme for first paint:
 * - an explicit stored choice wins (validated against the known set)
 * - otherwise honour prefers-color-scheme: dark
 * - otherwise the default "light"
 */
export function resolveTheme(
  stored: string | null | undefined,
  prefersDark: boolean
): Theme {
  if (isTheme(stored)) return stored;
  return prefersDark ? "dark" : "light";
}

/** Normalize any stored value (legacy junk / tampered storage → null). */
export function sanitizeStoredTheme(
  stored: string | null | undefined
): Theme | null {
  return isTheme(stored) ? stored : null;
}
