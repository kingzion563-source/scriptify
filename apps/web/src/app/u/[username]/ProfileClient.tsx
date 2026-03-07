"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { TrendingUp, FileCode, MessageSquare } from "lucide-react";
import { ScriptCard, ScriptCardGrid } from "@scriptify/ui";
import { LevelBadge } from "@/components/LevelBadge";
import { ProBadge } from "@/components/ProBadge";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";

type TabId = "scripts" | "liked" | "collections" | "activity";

interface Profile {
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
}

interface ScriptItem {
  id: string;
  slug: string;
  title: string;
  coverUrl: string | null;
  gameName: string;
  gameSlug: string;
  authorUsername: string;
  authorAvatar: string | null;
  isAuthorPro?: boolean;
  status: string;
  likeCount: number;
  viewCount: number;
  copyCount: number;
  tags: string[];
  rawCode: string;
  aiScore?: number;
}

interface CollectionItem {
  id: string;
  title: string;
  description: string | null;
  scriptCount: number;
  createdAt: string;
}

interface ActivityItem {
  type: "script" | "comment";
  createdAt: string;
  scriptTitle: string;
  scriptSlug: string;
  commentBody?: string;
}

export function ProfileClient({ initialProfile }: { initialProfile: Profile }) {
  const user = useAuthStore((s) => s.user);
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [tab, setTab] = useState<TabId>("scripts");
  const [scripts, setScripts] = useState<ScriptItem[]>([]);
  const [total, setTotal] = useState(0);
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [boostingId, setBoostingId] = useState<string | null>(null);
  const [boostedIds, setBoostedIds] = useState<Set<string>>(new Set());
  const [profileFetchError, setProfileFetchError] = useState(false);

  const isOwnProfile = user?.id === profile.id;

  useEffect(() => {
    if (!user || isOwnProfile) return;
    setProfileFetchError(false);
    apiFetch<Profile>(`/api/v1/users/${encodeURIComponent(profile.username)}`)
      .then((p) => {
        setProfile(p);
        setProfileFetchError(false);
      })
      .catch(() => {
        setProfileFetchError(true);
      });
  }, [user?.id, profile.username, isOwnProfile]);

  const fetchScripts = useCallback(
    async (tabId: TabId, page = 1) => {
      setLoading(true);
      try {
        if (tabId === "collections") {
          const res = await apiFetch<{ data: CollectionItem[] }>(
            `/api/v1/users/${encodeURIComponent(profile.username)}/scripts?tab=collections&page=${page}&limit=12`
          );
          setCollections(res.data ?? []);
        } else if (tabId === "activity") {
          const res = await apiFetch<{ data: ActivityItem[] }>(
            `/api/v1/users/${encodeURIComponent(profile.username)}/scripts?tab=activity&page=${page}&limit=12`
          );
          setActivity(res.data ?? []);
        } else {
          const res = await apiFetch<{ scripts: ScriptItem[]; total: number; page: number; limit: number }>(
            `/api/v1/users/${encodeURIComponent(profile.username)}/scripts?tab=${tabId}&page=${page}&limit=12`
          );
          setScripts(res.scripts);
          setTotal(res.total);
        }
      } catch {
        if (tabId === "collections") setCollections([]);
        else if (tabId === "activity") setActivity([]);
        else {
          setScripts([]);
          setTotal(0);
        }
      } finally {
        setLoading(false);
      }
    },
    [profile.username]
  );

  useEffect(() => {
    fetchScripts(tab);
  }, [tab, fetchScripts]);

  const handleFollow = async () => {
    if (!user || isOwnProfile) return;
    const prev = { ...profile };
    setFollowLoading(true);
    setProfile((p) => ({
      ...p,
      isFollowing: !p.isFollowing,
      followerCount: p.isFollowing ? p.followerCount - 1 : p.followerCount + 1,
    }));
    useAuthStore.setState((s) =>
      s.user
        ? {
            user: {
              ...s.user,
              followingCount: profile.isFollowing
                ? (s.user.followingCount ?? 0) - 1
                : (s.user.followingCount ?? 0) + 1,
            },
          }
        : s
    );
    try {
      const res = await apiFetch<{ following: boolean; followerCount: number; followingCount: number }>(
        `/api/v1/users/${profile.id}/follow`,
        { method: "POST" }
      );
      setProfile((p) => ({
        ...p,
        isFollowing: res.following,
        followerCount: res.followerCount,
      }));
      useAuthStore.setState((s) =>
        s.user ? { user: { ...s.user, followingCount: res.followingCount } } : s
      );
    } catch {
      setProfile(prev);
      useAuthStore.setState((s) =>
        s.user
          ? {
              user: {
                ...s.user,
                followingCount: profile.isFollowing
                  ? (s.user.followingCount ?? 0) + 1
                  : (s.user.followingCount ?? 0) - 1,
              },
            }
          : s
      );
    } finally {
      setFollowLoading(false);
    }
  };

  const handleTrendingBoost = async (scriptId: string) => {
    if (boostingId) return;
    setBoostingId(scriptId);
    try {
      await apiFetch(`/api/v1/scripts/${scriptId}/trending-boost`, { method: "POST" });
      setBoostedIds((prev) => new Set([...prev, scriptId]));
    } catch {
      // swallow
    } finally {
      setBoostingId(null);
    }
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: "scripts", label: "Scripts" },
    { id: "liked", label: "Liked" },
    { id: "collections", label: "Collections" },
    { id: "activity", label: "Activity" },
  ];

  return (
    <div style={{ padding: "24px 20px", minHeight: "calc(100vh - 56px)" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        {profileFetchError && (
          <p
            style={{
              fontSize: 13,
              color: "var(--status-patched)",
              textAlign: "center",
              margin: "16px 0",
            }}
          >
            Failed to load profile. Refresh the page to try again.
          </p>
        )}
        {/* Header: 64px avatar, username, level, pro, bio */}
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 20 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              overflow: "hidden",
              background: "var(--bg-surface-2)",
              flexShrink: 0,
            }}
          >
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24,
                  fontWeight: 600,
                  color: "var(--text-muted)",
                }}
              >
                {profile.username?.length > 0 ? profile.username[0].toUpperCase() : "?"}
              </div>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
              <h1
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  margin: 0,
                  letterSpacing: "-0.02em",
                }}
              >
                {profile.username}
              </h1>
              <LevelBadge level={profile.level} />
              {profile.isPro && <ProBadge />}
            </div>
            {profile.bio && (
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  margin: 0,
                  lineHeight: 1.5,
                  maxWidth: 400,
                }}
              >
                {profile.bio.slice(0, 200)}
              </p>
            )}
          </div>
          {!isOwnProfile && user && (
            <button
              type="button"
              onClick={handleFollow}
              disabled={followLoading}
              style={{
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 600,
                background: profile.isFollowing ? "var(--bg-surface-2)" : "var(--accent)",
                color: profile.isFollowing ? "var(--text-primary)" : "var(--accent-text)",
                border: profile.isFollowing ? "1px solid var(--border)" : "none",
                borderRadius: "var(--radius-md)",
                cursor: followLoading ? "not-allowed" : "pointer",
              }}
            >
              {profile.isFollowing ? "Unfollow" : "Follow"}
            </button>
          )}
        </div>

        {/* Stats bar */}
        <div
          style={{
            display: "flex",
            gap: 24,
            fontSize: 13,
            color: "var(--text-secondary)",
            marginBottom: 24,
            paddingBottom: 16,
            borderBottom: "1px solid var(--border)",
          }}
        >
          <span>
            <strong style={{ color: "var(--text-primary)" }}>{profile.scriptsCount}</strong> Scripts Posted
          </span>
          <span>
            <strong style={{ color: "var(--text-primary)" }}>{profile.totalCopies.toLocaleString()}</strong> Total Copies
          </span>
          <span>
            <strong style={{ color: "var(--text-primary)" }}>{profile.followerCount}</strong> Followers
          </span>
          <span>
            <strong style={{ color: "var(--text-primary)" }}>{profile.followingCount}</strong> Following
          </span>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              style={{
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 600,
                background: tab === t.id ? "var(--accent)" : "transparent",
                color: tab === t.id ? "var(--accent-text)" : "var(--text-secondary)",
                border: "none",
                borderBottom: tab === t.id ? "2px solid var(--accent)" : "2px solid transparent",
                cursor: "pointer",
                borderRadius: "var(--radius-sm)",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
            Loading...
          </div>
        ) : tab === "collections" ? (
          collections.length > 0 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                gap: 16,
              }}
            >
              {collections.map((c) => (
                <div
                  key={c.id}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    padding: 14,
                    background: "var(--bg-surface)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      marginBottom: 6,
                    }}
                  >
                    {c.title}
                  </div>
                  {c.description && (
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--text-secondary)",
                        marginBottom: 6,
                        lineHeight: 1.4,
                      }}
                    >
                      {c.description}
                    </div>
                  )}
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                    }}
                  >
                    {c.scriptCount} script{c.scriptCount !== 1 ? "s" : ""}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
              No collections yet.
            </div>
          )
        ) : tab === "activity" ? (
          activity.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {activity.map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    padding: 12,
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    background: "var(--bg-surface)",
                  }}
                >
                  <div style={{ flexShrink: 0, color: "var(--text-muted)" }}>
                    {item.type === "script" ? (
                      <FileCode size={18} />
                    ) : (
                      <MessageSquare size={18} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 2 }}>
                      {item.type === "script" ? "Published script" : "Commented on script"}
                    </div>
                    <Link
                      href={`/script/${item.scriptSlug}`}
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        textDecoration: "none",
                      }}
                    >
                      {item.scriptTitle}
                    </Link>
                    {item.type === "comment" && item.commentBody && (
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--text-muted)",
                          marginTop: 4,
                          lineHeight: 1.4,
                        }}
                      >
                        {item.commentBody}
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      flexShrink: 0,
                    }}
                  >
                    {new Date(item.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
              No activity yet.
            </div>
          )
        ) : (tab === "scripts" || tab === "liked") && scripts.length > 0 ? (
          <ScriptCardGrid>
            {scripts.map((s, i) => (
              <div key={s.id} style={{ position: "relative" }}>
                <Link href={`/script/${s.slug}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                  <ScriptCard
                    id={s.id}
                    title={s.title}
                    coverUrl={s.coverUrl}
                    gameName={s.gameName || "—"}
                    gameSlug={s.gameSlug || ""}
                    authorUsername={s.authorUsername}
                    authorAvatar={s.authorAvatar}
                    isAuthorPro={s.isAuthorPro}
                    status={(s.status as "verified" | "patched" | "testing") || "testing"}
                    likeCount={s.likeCount}
                    viewCount={s.viewCount}
                    copyCount={s.copyCount}
                    tags={s.tags}
                    rawCode={s.rawCode}
                    aiScore={s.aiScore}
                    index={i}
                  />
                </Link>
                {isOwnProfile && user?.isPro && tab === "scripts" && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      handleTrendingBoost(s.id);
                    }}
                    disabled={boostingId === s.id || boostedIds.has(s.id)}
                    title={boostedIds.has(s.id) ? "Trending boost active" : "Boost to trending for 24h"}
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "4px 10px",
                      fontSize: 11,
                      fontWeight: 700,
                      background: boostedIds.has(s.id) ? "var(--pro-gold-bg)" : "var(--accent)",
                      color: boostedIds.has(s.id) ? "var(--pro-gold)" : "var(--accent-text)",
                      border: boostedIds.has(s.id) ? "1px solid var(--pro-gold)" : "none",
                      borderRadius: 6,
                      cursor: boostingId === s.id || boostedIds.has(s.id) ? "default" : "pointer",
                      opacity: boostingId === s.id ? 0.6 : 1,
                      zIndex: 10,
                    }}
                  >
                    <TrendingUp size={11} />
                    {boostedIds.has(s.id) ? "Boosted" : boostingId === s.id ? "…" : "Boost"}
                  </button>
                )}
              </div>
            ))}
          </ScriptCardGrid>
        ) : (tab === "scripts" || tab === "liked") && total === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
            {tab === "scripts" ? "No scripts yet." : "No liked scripts."}
          </div>
        ) : (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
            Coming soon.
          </div>
        )}
      </div>
    </div>
  );
}
