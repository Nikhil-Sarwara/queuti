/**
 * Lightweight User-Agent parser — no external dependencies.
 * Parses browser, OS, and device type from raw UA strings.
 */

type DeviceType = "desktop" | "mobile" | "tablet" | "unknown";

interface ParsedUA {
  browser: string;
  os: string;
  device: DeviceType;
}

const browsers: [RegExp, string][] = [
  [/Edg[e\/]?\s*([\d.]+)/i, "Edge"],
  [/OPR[\/\s]([\d.]+)/i, "Opera"],
  [/Chrome[\/\s]([\d.]+)/i, "Chrome"],
  [/Firefox[\/\s]([\d.]+)/i, "Firefox"],
  [/Version[\/\s]([\d.]+).*Safari/i, "Safari"],
  [/Safari[\/\s]([\d.]+)/i, "Safari"],
];

const osList: [RegExp, string][] = [
  [/Windows NT 10/i, "Windows 10"],
  [/Windows NT 6\.3/i, "Windows 8.1"],
  [/Windows NT 6\.2/i, "Windows 8"],
  [/Windows NT 6\.1/i, "Windows 7"],
  [/Windows/i, "Windows"],
  [/Mac OS X ([\d_.]+)/i, "macOS"],
  [/iPhone OS ([\d_]+)/i, "iOS"],
  [/iPad.*OS ([\d_]+)/i, "iOS"],
  [/Android ([\d.]+)/i, "Android"],
  [/Linux/i, "Linux"],
];

const mobileKeywords =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i;

export function parseUserAgent(ua: string | null): ParsedUA {
  if (!ua) return { browser: "Unknown", os: "Unknown", device: "unknown" };

  // Browser
  let browser = "Unknown";
  for (const [re, name] of browsers) {
    const m = ua.match(re);
    if (m) {
      browser = name + (m[1] ? " " + m[1].split(".")[0] : "");
      break;
    }
  }

  // OS
  let os = "Unknown";
  for (const [re, name] of osList) {
    const m = ua.match(re);
    if (m) {
      if (name === "macOS" && m[1]) {
        os = name + " " + m[1].replace(/_/g, ".");
      } else if (m[1] && (name === "Android" || name.startsWith("Windows") || name.startsWith("iOS"))) {
        os = name + " " + m[1].split(".").slice(0, 2).join(".");
      } else {
        os = name;
      }
      break;
    }
  }

  // Device type
  let device: DeviceType = "desktop";
  if (/tablet|iPad/i.test(ua)) {
    device = "tablet";
  } else if (mobileKeywords.test(ua) && !/tablet|iPad/i.test(ua)) {
    device = "mobile";
  }

  return { browser, os, device };
}
