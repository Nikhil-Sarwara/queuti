import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        leather: {
          100: "#e9d9c4",
          200: "#d3b493",
          300: "#b5865a",
          400: "#96663f",
          500: "#7a5434",
          600: "#6b4a2f",
          700: "#543a25",
          800: "#3f2b1b",
          900: "#2b1d12",
          DEFAULT: "#6b4a2f",
        },
        wood: { light: "#c9a06b", DEFAULT: "#a97c4d", dark: "#7d5a36" },
        paper: { light: "#f6f0e2", DEFAULT: "#ece4d4", dark: "#ddd3bd" },
        brass: { light: "#e2c254", DEFAULT: "#c9a227", dark: "#a8861f" },
        ink: { DEFAULT: "#2b2117", soft: "#5c4d3a", faint: "#8a7a63" },
        blood: { light: "#b04a3a", DEFAULT: "#8e3b2e", dark: "#6e2c22" },
        moss: { light: "#74864f", DEFAULT: "#5a6b3c", dark: "#46542e" },
      },
      boxShadow: {
        "bevel-sm":
          "inset 0 1px 1px rgba(255,255,255,.5), inset 0 -1px 2px rgba(0,0,0,.28), 0 1px 2px rgba(0,0,0,.22)",
        bevel:
          "inset 0 1px 2px rgba(255,255,255,.55), inset 0 -2px 3px rgba(0,0,0,.3), 0 2px 4px rgba(0,0,0,.28)",
        "bevel-lg":
          "inset 0 1px 2px rgba(255,255,255,.6), inset 0 -3px 5px rgba(0,0,0,.32), 0 5px 12px rgba(0,0,0,.3)",
        pressed:
          "inset 0 2px 5px rgba(0,0,0,.4), inset 0 -1px 1px rgba(255,255,255,.2), 0 1px 1px rgba(0,0,0,.15)",
        engraved:
          "inset 0 2px 5px rgba(43,33,23,.28), inset 0 -1px 1px rgba(255,255,255,.4)",
        raised:
          "0 4px 8px rgba(43,33,23,.3), inset 0 1px 1px rgba(255,255,255,.45)",
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
