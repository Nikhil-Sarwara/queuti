// FOUC-free theme bootstrap (#31): runs before first paint, sets
// data-theme on <html> from localStorage (explicit choice) or the OS
// prefers-color-scheme (first visit). Themes: paper (default), dark,
// midnight.
const THEME_INIT_SCRIPT = `(function(){
  try {
    var t = localStorage.getItem("queuti-theme");
    if (t !== "paper" && t !== "dark" && t !== "midnight") {
      t = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "paper";
    }
    document.documentElement.setAttribute("data-theme", t);
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "paper");
  }
})();`;

export function ThemeInit() {
  // next/script with strategy="beforeInteractive" would be ideal, but an
  // inline script at the very top of <body> runs before React hydrates and
  // before paint — good enough to prevent a theme flash.
  return (
    <script
      dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
      data-queuti-theme-init="true"
    />
  );
}