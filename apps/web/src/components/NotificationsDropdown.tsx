"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Bell,
  MessageSquare,
  CornerDownRight,
  UserPlus,
  TrendingUp,
  Star,
  Award,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { useLevelUpStore } from "@/stores/levelUpStore";
import { useToast } from "@/lib/useToast";
import { getLevelName } from "@/lib/levels";

const NOTIFICATION_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  COMMENT_ON_SCRIPT: MessageSquare,
  REPLY_TO_COMMENT: CornerDownRight,
  NEW_FOLLOWER: UserPlus,
  SCRIPT_MILESTONE: TrendingUp,
  SCRIPT_FEATURED: Star,
  LEVEL_UP: Award,
  SCRIPT_FLAGGED: AlertTriangle,
  SCRIPT_APPROVED: CheckCircle,
};

const NOTIFICATION_LABELS: Record<string, string> = {
  COMMENT_ON_SCRIPT: "commented on your script",
  REPLY_TO_COMMENT: "replied to your comment",
  NEW_FOLLOWER: "started following you",
  SCRIPT_MILESTONE: "Your script hit a milestone",
  SCRIPT_FEATURED: "Your script was featured",
  LEVEL_UP: "You leveled up",
  SCRIPT_FLAGGED: "Your script was flagged for review",
  SCRIPT_APPROVED: "Your script was approved",
};

interface NotificationItem {
  id: string;
  type: string;
  actorId: string | null;
  targetType: string | null;
  targetId: string | null;
  targetUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

export function NotificationsDropdown() {
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const show = useToast();

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setFetchError(false);
    try {
      const res = await apiFetch<{ notifications: NotificationItem[]; unreadCount: number }>(
        "/api/v1/notifications"
      );
      setNotifications(res.notifications);
      setUnreadCount(res.unreadCount);
    } catch (err) {
      setFetchError(true);
      show(err instanceof Error ? err.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [user, show]);

  useEffect(() => {
    if (user && open) fetchNotifications();
  }, [user, open, fetchNotifications]);

  const showLevelUpToast = useLevelUpStore((s) => s.showToast);

  useEffect(() => {
    if (!user?.id) return;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return;
    import("@supabase/supabase-js")
      .then(({ createClient }) => {
        try {
          const supabase = createClient(url, key);
          const channel = supabase.channel(`user:${user.id}:notifications`);
          channel.on("broadcast", { event: "new_notification" }, async () => {
            setUnreadCount((c) => c + 1);
            try {
              const res = await apiFetch<{ notifications: NotificationItem[]; unreadCount: number }>(
                "/api/v1/notifications"
              );
              const levelUp = res.notifications.find((n) => n.type === "LEVEL_UP" && !n.isRead);
              if (levelUp) {
                const authRes = await apiFetch<{ user: { id: string; username: string; email: string; role: string; isPro: boolean; level: number; avatarUrl: string | null } }>("/api/v1/auth/refresh", {
                  method: "POST",
                });
                useAuthStore.setState({ user: authRes.user });
                showLevelUpToast(authRes.user.level, getLevelName(authRes.user.level));
              }
            } catch {
              //
            }
          });
          channel.subscribe();
          return () => {
            channel.unsubscribe();
          };
        } catch {
          return () => {};
        }
      })
      .catch(() => {
        //
      });
  }, [user?.id, showLevelUpToast]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("click", onClickOutside);
    return () => document.removeEventListener("click", onClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    if (!user) return;
    try {
      await apiFetch("/api/v1/notifications/read-all", { method: "PATCH" });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      show("Failed to mark notifications as read. Please try again.");
    }
  };

  const handleNotificationClick = async (id: string, targetUrl: string | null) => {
    if (!targetUrl) return;
    try {
      await apiFetch(`/api/v1/notifications/${id}/read`, { method: "PATCH" });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      show("Failed to update notification. Please try again.");
    }
    setOpen(false);
  };

  if (!user) return null;

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center justify-center h-8 w-8 rounded-md text-secondary hover:text-primary hover:bg-surface-2 transition-colors duration-100"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" strokeWidth={2} />
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: 2,
              right: 2,
              minWidth: 16,
              height: 16,
              padding: "0 4px",
              fontSize: 10,
              fontWeight: 700,
              color: "var(--text-inverse)",
              background: "var(--status-patched)",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: 8,
            width: 320,
            maxHeight: 400,
            overflowY: "auto",
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
            zIndex: 200,
          }}
        >
          <div
            style={{
              padding: "10px 12px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                style={{
                  fontSize: 11,
                  color: "var(--text-link)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {loading ? (
            <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: "var(--text-muted)" }}>
              Loading...
            </div>
          ) : fetchError ? (
            <div style={{ padding: 24, textAlign: "center", fontSize: 13, color: "var(--status-patched)" }}>
              Failed to load notifications.
            </div>
          ) : notifications.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: "var(--text-muted)" }}>
              No notifications yet
            </div>
          ) : (
            <div style={{ padding: "4px 0" }}>
              {notifications.map((n) => {
                const IconItem = NOTIFICATION_ICONS[n.type] ?? Bell;
                const label = NOTIFICATION_LABELS[n.type] ?? n.type;
                const itemStyle: React.CSSProperties = {
                  display: "flex",
                  gap: 10,
                  padding: "10px 12px",
                  background: n.isRead ? "transparent" : "var(--bg-surface-2)",
                  borderBottom: "1px solid var(--border)",
                };
                const content = (
                  <>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "var(--radius-sm)",
                        background: "var(--bg-surface-3)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <IconItem size={14} style={{ color: "var(--text-secondary)" }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, color: "var(--text-primary)", margin: 0, lineHeight: 1.4 }}>
                        {label}
                      </p>
                      <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "2px 0 0" }}>
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    {!n.isRead && (
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          background: "var(--accent)",
                          flexShrink: 0,
                          marginTop: 6,
                        }}
                      />
                    )}
                  </>
                );
                if (n.targetUrl) {
                  return (
                    <Link
                      key={n.id}
                      href={n.targetUrl}
                      onClick={() => handleNotificationClick(n.id, n.targetUrl)}
                      style={{
                        ...itemStyle,
                        textDecoration: "none",
                        color: "inherit",
                        cursor: "pointer",
                      }}
                    >
                      {content}
                    </Link>
                  );
                }
                return (
                  <div key={n.id} style={itemStyle}>
                    {content}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
