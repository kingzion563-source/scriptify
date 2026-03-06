import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ScriptDetailClient } from "./ScriptDetailClient";
import type { ScriptDetail } from "./ScriptDetailClient";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function fetchScript(slug: string): Promise<ScriptDetail | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/scripts/${slug}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return res.json() as Promise<ScriptDetail>;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const script = await fetchScript(params.slug);
  if (!script) {
    return { title: "Script Not Found | Scriptify" };
  }

  const gameName = script.game?.name ?? "Roblox";
  const title = `${script.title} - ${gameName} Scripts | Scriptify`;
  const description = script.description
    ? script.description.slice(0, 160)
    : `Free Roblox Lua script: ${script.title}. Browse and copy free community scripts on Scriptify.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: `/script/${script.slug}/opengraph-image` }],
    },
  };
}

export default async function ScriptPage({
  params,
}: {
  params: { slug: string };
}) {
  const script = await fetchScript(params.slug);

  if (!script) {
    notFound();
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: script.title,
    applicationCategory: "DeveloperApplication",
    operatingSystem:
      script.platform === "BOTH"
        ? "Windows, iOS, Android"
        : script.platform === "PC"
          ? "Windows"
          : "iOS, Android",
    description: script.description ?? script.title,
    url: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/script/${script.slug}`,
    author: {
      "@type": "Person",
      name: script.author.username,
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: script.likeCount + script.dislikeCount > 0
        ? Math.max(1, Math.min(5, (script.likeCount / (script.likeCount + script.dislikeCount)) * 5))
        : 3,
      ratingCount: Math.max(1, script.likeCount + script.dislikeCount),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ScriptDetailClient script={script} />
    </>
  );
}
