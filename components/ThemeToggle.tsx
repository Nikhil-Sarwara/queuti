"use client";

import { useEffect, useState } from "react";

type Theme = "paper" | "dark" | "midnight";

const THEMES: { id: Theme; icon: string; label: string }[] = [
  { id: "paper", icon: "📜", label: "Paper" },
  { id: "dark", icon: "🧳", label: "Dark" },
  { id: "midnight", icon: "🌙", label: "Midnight" },
];

/**
 * Skeuomorphic theme switcher (#31): swaps the data-theme attribute on
 * <html> (all tokens are CSS variables, so the whole UI re-themes) and
 * persists the choice in localStorage. Defaults to prefers-color-scheme on
 * first visit (see app/theme-init.tsx).
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("paper");

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    if (current === "dark" || current === "midnight") setTheme(current);
  }, []);

  const apply = (t: Theme) => {
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t);
    try {
      localStorage.setItem("queuti-theme", t);
    } catch {
      /* private mode — theme still applies for this session */
    }
  };

  return (
    <div
      role="group"
      aria-label="Theme"
      className="fixed bottom-3 right-3 z-50 flex items-center gap-0.5 rounded-full border-2 border-b-4 border-paper-dark/80 bg-gradient-to-b from-paper-light to-paper p-1 shadow-bevel-lg"
    >
      {THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          title={`${t.label} theme`}
          aria-pressed={theme === t.id}
          onClick={() => apply(t.id)}
          className={`rounded-full px-2.5 py-1.5 text-sm transition active:translate-y-px ${
            theme === t.id
              ? "border border-brass-dark/60 bg-gradient-to-b from-brass-light to-brass text-ink shadow-bevel-sm"
              : "text-ink-soft opacity-70 hover:opacity-100"
          }`}
        >
          <span aria-hidden>{t.icon}</span>
          <span className="sr-only">{t.label}</span>
        </button>
      ))}
    </div>
  );
}