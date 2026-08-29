// FOUC-free theme bootstrap (v2): runs before first paint, sets
// data-theme on <html> from localStorage (explicit choice) or the OS
// prefers-color-scheme (first visit). Themes: light (default), dark.
import { THEME_STORAGE_KEY } from "@/lib/theme";

const THEME_INIT_SCRIPT = `(function(){
  try {
    var t = localStorage.getItem("${THEME_STORAGE_KEY}");
    if (t !== "light" && t !== "dark") {
      t = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    document.documentElement.setAttribute("data-theme", t);
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "light");
  }
})();`;

export function ThemeInit() {
  return (
    <script
      dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
      data-queuti-theme-init="true"
    />
  );
}
