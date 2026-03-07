import { notFound } from "next/navigation";
import { getApiUrl } from "@/lib/api";
import { ProfileClient, type Profile } from "./ProfileClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  try {
    const res = await fetch(getApiUrl(`/api/v1/users/${encodeURIComponent(username)}`), {
      cache: "no-store",
    });
    if (!res.ok) return { title: "User | Scriptify" };
    const data = await res.json();
    return {
      title: `${data.username} | Scriptify`,
      description: data.bio?.slice(0, 160) ?? `Profile of ${data.username} on Scriptify`,
    };
  } catch {
    return { title: "User | Scriptify" };
  }
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  let profile: {
    id: string;
    username: string;
    avatarUrl: string | null;
    bio: string;
    level: number;
    isPro: boolean;
    followerCount: number;
    followingCount: number;
    scriptsCount: number;
    totalCopies: number;
    isFollowing: boolean;
  } | null = null;

  try {
    const res = await fetch(getApiUrl(`/api/v1/users/${encodeURIComponent(username)}`), {
      cache: "no-store",
    });
    if (!res.ok) {
      if (res.status === 404) notFound();
      throw new Error("Failed to load profile");
    }
    profile = await res.json();
  } catch {
    notFound();
  }

  if (!profile) return notFound();
  return <ProfileClient initialProfile={profile as Profile} />;
}
