import { describe, expect, it } from "vitest";
import {
  THEME_STORAGE_KEY,
  isTheme,
  resolveTheme,
  sanitizeStoredTheme,
} from "@/lib/theme";

describe("theme persistence (v2)", () => {
  it("recognises only the two known themes", () => {
    expect(isTheme("light")).toBe(true);
    expect(isTheme("dark")).toBe(true);
    expect(isTheme("paper")).toBe(false);
    expect(isTheme("midnight")).toBe(false);
    expect(isTheme("blue")).toBe(false);
    expect(isTheme("")).toBe(false);
    expect(isTheme(null)).toBe(false);
    expect(isTheme(undefined)).toBe(false);
  });

  it("an explicit stored choice wins over system preference", () => {
    expect(resolveTheme("dark", false)).toBe("dark");
    expect(resolveTheme("light", true)).toBe("light");
  });

  it("falls back to prefers-color-scheme on first visit (no stored choice)", () => {
    expect(resolveTheme(null, true)).toBe("dark");
    expect(resolveTheme(undefined, false)).toBe("light");
  });

  it("ignores tampered/legacy stored values and falls back to the default", () => {
    expect(resolveTheme("hotdog", true)).toBe("dark"); // system pref still applies
    expect(resolveTheme("hotdog", false)).toBe("light");
    expect(sanitizeStoredTheme("hotdog")).toBeNull();
    expect(sanitizeStoredTheme("dark")).toBe("dark");
    expect(sanitizeStoredTheme("light")).toBe("light");
    expect(sanitizeStoredTheme(null)).toBeNull();
  });

  it("uses the documented localStorage key", () => {
    expect(THEME_STORAGE_KEY).toBe("queuti-theme");
  });
});
