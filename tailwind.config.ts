import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        bevel: "inset 0 1px 2px rgba(255,255,255,.55), inset 0 -2px 3px rgba(0,0,0,.25), 0 2px 4px rgba(0,0,0,.3)",
      },
    },
  },
  plugins: [],
};
export default config;
