import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GamePageClient } from "./GamePageClient";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export interface GameData {
  id: string;
  name: string;
  slug: string;
  thumbnailUrl: string | null;
  playerCountCached: number;
  scriptCount: number;
  category: string | null;
}

async function fetchGame(slug: string): Promise<GameData | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/games/${encodeURIComponent(slug)}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return res.json() as Promise<GameData>;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const game = await fetchGame(params.slug);
  if (!game) {
    return { title: "Game Not Found | Scriptify" };
  }
  return {
    title: `${game.name} Scripts | Scriptify`,
    description: `Browse free Roblox Lua scripts for ${game.name}. Community scripts, all free.`,
  };
}

export default async function GamePage({
  params,
}: {
  params: { slug: string };
}) {
  const game = await fetchGame(params.slug);

  if (!game) {
    notFound();
  }

  return <GamePageClient game={game} />;
}
