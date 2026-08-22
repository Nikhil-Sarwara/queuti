import type { MetadataRoute } from "next";

/** Basic PWA manifest — installable Queuti (#22). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Queuti — Job Tracker & Market Intelligence",
    short_name: "Queuti",
    description:
      "Track every job application, learn from real data, know the market.",
    start_url: "/",
    display: "standalone",
    background_color: "#ece4d4",
    theme_color: "#6b4a2f",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}