"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

/**
 * Simple light/dark theme toggle. Fixed bottom-right position.
 * Swaps data-theme on <html> and persists to localStorage.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    if (current === "dark" || current === "light") setTheme(current);
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
      className="fixed bottom-3 right-3 z-50 flex items-center gap-1 rounded-full border border-border bg-surface p-1 shadow-1"
    >
      <button
        type="button"
        title="Light theme"
        aria-pressed={theme === "light"}
        onClick={() => apply("light")}
        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm transition-all duration-150 ${
          theme === "light"
            ? "bg-accent text-white shadow-1"
            : "text-text-secondary hover:text-text-primary hover:bg-elevated"
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
        <span className="sr-only">Light</span>
      </button>

      <button
        type="button"
        title="Dark theme"
        aria-pressed={theme === "dark"}
        onClick={() => apply("dark")}
        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm transition-all duration-150 ${
          theme === "dark"
            ? "bg-accent text-white shadow-1"
            : "text-text-secondary hover:text-text-primary hover:bg-elevated"
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
        <span className="sr-only">Dark</span>
      </button>
    </div>
  );
}
