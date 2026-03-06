import type { MetadataRoute } from "next";

export const revalidate = 0;
export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "hourly", priority: 1 },
    { url: `${SITE_URL}/search`, changeFrequency: "hourly", priority: 0.8 },
    { url: `${SITE_URL}/publish`, changeFrequency: "daily", priority: 0.6 },
    { url: `${SITE_URL}/pro`, changeFrequency: "weekly", priority: 0.5 },
  ];

  try {
    const res = await fetch(`${API_URL}/api/v1/scripts/sitemap`, { cache: "no-store" });
    if (!res.ok) return base;
    const data = (await res.json()) as { scripts: { slug: string; updatedAt: string }[] };
    return [
      ...base,
      ...data.scripts.map((s) => ({
        url: `${SITE_URL}/script/${s.slug}`,
        lastModified: new Date(s.updatedAt),
        changeFrequency: "daily" as const,
        priority: 0.7,
      })),
    ];
  } catch {
    return base;
  }
}

