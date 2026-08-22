import type { MetadataRoute } from "next";

const BASE = "https://queuti.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: BASE, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/login`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/dashboard`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/stats`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
  ];
}