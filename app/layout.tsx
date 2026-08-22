import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/Toaster";
import { ThemeInit } from "./theme-init";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SearchPalette } from "@/components/SearchPalette";

export const metadata: Metadata = {
  title: { default: "Queuti — Job Tracker & Market Intelligence", template: "%s · Queuti" },
  description:
    "Track every job application, learn from real data, and know the market — a skeuomorphic job-hunt companion.",
  applicationName: "Queuti",
  icons: { icon: "/icon.svg" },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Queuti", statusBarStyle: "default" },
  openGraph: {
    title: "Queuti — Job Tracker & Market Intelligence",
    description:
      "Track every job application, learn from real data, and know the market — a skeuomorphic job-hunt companion.",
    url: "https://queuti.com",
    siteName: "Queuti",
    type: "website",
    images: [{ url: "/icon.svg", width: 64, height: 64, alt: "Queuti owl mark" }],
  },
  twitter: {
    card: "summary",
    title: "Queuti — Job Tracker & Market Intelligence",
    description: "Track every application, learn from real data, know the market.",
    images: ["/icon.svg"],
  },
};

export const viewport: Viewport = {
  themeColor: "#6b4a2f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThemeInit />
        {children}
        <ThemeToggle />
        <SearchPalette />
        <Toaster />
      </body>
    </html>
  );
}
