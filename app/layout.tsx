import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/Toaster";
import { ThemeInit } from "./theme-init";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SearchPalette } from "@/components/SearchPalette";

export const metadata: Metadata = {
  title: { default: "Queuti — Job Tracker & Market Intelligence", template: "%s · Queuti" },
  description:
    "Track every job application, learn from real data, and know the market — your modern job-hunt companion.",
  applicationName: "Queuti",
  icons: { icon: "/icon.svg" },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Queuti", statusBarStyle: "default" },
  openGraph: {
    title: "Queuti — Job Tracker & Market Intelligence",
    description:
      "Track every job application, learn from real data, and know the market — your modern job-hunt companion.",
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
  themeColor: "#5B5FC7",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-dvh bg-bg font-sans text-text-primary antialiased">
        <ThemeInit />
        {children}
        <ThemeToggle />
        <SearchPalette />
        <Toaster />
      </body>
    </html>
  );
}
