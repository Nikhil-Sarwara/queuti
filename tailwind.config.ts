import type { Config } from "tailwindcss";

/**
 * Queuti's skeuomorphic design system (#31): every color/shadow is a CSS
 * variable (see app/globals.css) resolved to `rgb(var(--x) / <alpha-value>)`
 * so Tailwind opacity modifiers (bg-ink/10, border-brass/50, …) keep
 * working, while the whole palette re-themes via `data-theme` on <html>.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        leather: {
          100: "rgb(var(--leather-100) / <alpha-value>)",
          200: "rgb(var(--leather-200) / <alpha-value>)",
          300: "rgb(var(--leather-300) / <alpha-value>)",
          400: "rgb(var(--leather-400) / <alpha-value>)",
          500: "rgb(var(--leather-500) / <alpha-value>)",
          600: "rgb(var(--leather-600) / <alpha-value>)",
          700: "rgb(var(--leather-700) / <alpha-value>)",
          800: "rgb(var(--leather-800) / <alpha-value>)",
          900: "rgb(var(--leather-900) / <alpha-value>)",
          DEFAULT: "rgb(var(--leather) / <alpha-value>)",
        },
        wood: {
          light: "rgb(var(--wood-light) / <alpha-value>)",
          DEFAULT: "rgb(var(--wood) / <alpha-value>)",
          dark: "rgb(var(--wood-dark) / <alpha-value>)",
        },
        paper: {
          light: "rgb(var(--paper-light) / <alpha-value>)",
          DEFAULT: "rgb(var(--paper) / <alpha-value>)",
          dark: "rgb(var(--paper-dark) / <alpha-value>)",
        },
        brass: {
          light: "rgb(var(--brass-light) / <alpha-value>)",
          DEFAULT: "rgb(var(--brass) / <alpha-value>)",
          dark: "rgb(var(--brass-dark) / <alpha-value>)",
        },
        ink: {
          DEFAULT: "rgb(var(--ink) / <alpha-value>)",
          soft: "rgb(var(--ink-soft) / <alpha-value>)",
          faint: "rgb(var(--ink-faint) / <alpha-value>)",
        },
        blood: {
          light: "rgb(var(--blood-light) / <alpha-value>)",
          DEFAULT: "rgb(var(--blood) / <alpha-value>)",
          dark: "rgb(var(--blood-dark) / <alpha-value>)",
        },
        moss: {
          light: "rgb(var(--moss-light) / <alpha-value>)",
          DEFAULT: "rgb(var(--moss) / <alpha-value>)",
          dark: "rgb(var(--moss-dark) / <alpha-value>)",
        },
      },
      boxShadow: {
        "bevel-sm":
          "inset 0 1px 1px var(--sh-hi), inset 0 -1px 2px var(--sh-lo), 0 1px 2px var(--sh-drop)",
        bevel:
          "inset 0 1px 2px var(--sh-hi), inset 0 -2px 3px var(--sh-lo), 0 2px 4px var(--sh-drop)",
        "bevel-lg":
          "inset 0 1px 2px var(--sh-hi-strong), inset 0 -3px 5px var(--sh-lo-strong), 0 5px 12px var(--sh-drop-lg)",
        pressed:
          "inset 0 2px 5px var(--sh-lo-strong), inset 0 -1px 1px var(--sh-hi), 0 1px 1px var(--sh-drop)",
        engraved: "inset 0 2px 5px var(--engrave-lo), inset 0 -1px 1px var(--engrave-hi)",
        raised: "0 4px 8px var(--sh-drop-lg), inset 0 1px 1px var(--sh-hi)",
      },
      fontFamily: {
        display: ["Georgia", "Cambria", "Times New Roman", "serif"],
      },
      borderRadius: {
        panel: "0.75rem",
      },
    },
  },
  plugins: [],
};
export default config;