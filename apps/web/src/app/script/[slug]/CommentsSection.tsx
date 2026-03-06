"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import DOMPurify from "dompurify";
import { formatDistanceToNow } from "date-fns";
import {
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Flag,
  Pin,
  Loader2,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "@/lib/useToast";
import { LevelBadge } from "@/components/LevelBadge";
import { ProBadge } from "@/components/ProBadge";
import { ReportModal } from "@/components/ReportModal";

export interface CommentUser {
  id: string;
  username: string;
  avatarUrl: string | null;
  level: number;
  isPro: boolean;
}

export interface CommentItem {
  id: string;
  body: string;
  likeCount: number;
  dislikeCount: number;
  isEdited: boolean;
  isDeleted: boolean;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  user: CommentUser;
  userVote: number | null;
  replies: Array<{
    id: string;
    body: string;
    likeCount: number;
    dislikeCount: number;
    isEdited: boolean;
    isDeleted: boolean;
    createdAt: string;
    updatedAt: string;
    user: CommentUser;
    userVote: number | null;
  }>;
}

function CommentBody({ body, isDeleted }: { body: string; isDeleted: boolean }) {
  if (isDeleted) {
    return <span style={{ fontStyle: "italic", color: "var(--text-muted)" }}>[deleted]</span>;
  }
  const safe = DOMPurify.sanitize(body, { ALLOWED_TAGS: [] });
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p style={{ margin: "0 0 6px", fontSize: 13, lineHeight: 1.5 }}>{children}</p>,
        strong: ({ children }) => <strong style={{ fontWeight: 600 }}>{children}</strong>,
        em: ({ children }) => <em>{children}</em>,
        code: ({ className, children, ...props }) => {
          const isBlock = Boolean(className);
          if (isBlock) {
            return (
              <pre
                style={{
                  fontFamily: "var(--font-jetbrains-mono), monospace",
                  fontSize: 12,
                  background: "var(--bg-surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  padding: 8,
                  overflow: "auto",
                  margin: "4px 0",
                }}
              >
                <code {...props}>{children}</code>
              </pre>
            );
          }
          return (
            <code
              style={{
                fontFamily: "var(--font-jetbrains-mono), monospace",
                fontSize: 12,
                background: "var(--bg-surface-2)",
                padding: "1px 4px",
                borderRadius: 3,
              }}
              {...props}
            >
              {children}
            </code>
          );
        },
        a: () => null,
      }}
    >
      {safe}
    </ReactMarkdown>
  );
}

function InlineLevelBadge({ level }: { level: number }) {
  return (
    <span style={{ marginLeft: 4 }}>
      <LevelBadge level={level} />
    </span>
  );
}


function SingleComment({
  comment,
  scriptAuthorId,
  currentUserId,
  onVote,
  onReply,
  onPin,
  onReport,
  isReply,
}: {
  comment: CommentItem;
  scriptAuthorId: string;
  currentUserId: string | null;
  onVote: (id: string, value: number) => void;
  onReply: (parentId: string) => void;
  onPin: (id: string, isPinned: boolean) => void;
  onReport: (id: string) => void;
  isReply?: boolean;
}) {
  const canPin = currentUserId === scriptAuthorId && !isReply;

  return (
    <div
      style={{
        padding: isReply ? "8px 0 8px 32px" : "12px 0",
        borderBottom: isReply ? "none" : "1px solid var(--border)",
      }}
    >
      <div style={{ display: "flex", gap: 10 }}>
        <div
          style={{
            position: "relative",
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "var(--bg-surface-2)",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          {comment.user.avatarUrl ? (
            <Image
              src={comment.user.avatarUrl}
              alt=""
              fill
              sizes="32px"
              style={{ objectFit: "cover" }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-muted)",
              }}
            >
              {comment.user.username?.length > 0 ? comment.user.username[0].toUpperCase() : "?"}
            </div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap", marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
              {comment.user.username}
            </span>
            <InlineLevelBadge level={comment.user.level} />
            {comment.user.isPro && <ProBadge />}
            {comment.isPinned && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  marginLeft: 4,
                }}
              >
                Pinned
              </span>
            )}
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
            </span>
            {comment.isEdited && (
              <span style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic" }}>edited</span>
            )}
          </div>
          <div style={{ color: "var(--text-secondary)", marginBottom: 8 }}>
            <CommentBody body={comment.body} isDeleted={comment.isDeleted} />
          </div>
          {!comment.isDeleted && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => onVote(comment.id, comment.userVote === 1 ? 0 : 1)}
                disabled={!currentUserId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  background: "none",
                  border: "none",
                  cursor: currentUserId ? "pointer" : "default",
                  fontSize: 12,
                  color: "var(--text-muted)",
                  padding: 0,
                }}
              >
                <ThumbsUp size={12} />
                {comment.likeCount}
              </button>
              <button
                type="button"
                onClick={() => onVote(comment.id, comment.userVote === -1 ? 0 : -1)}
                disabled={!currentUserId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  background: "none",
                  border: "none",
                  cursor: currentUserId ? "pointer" : "default",
                  fontSize: 12,
                  color: "var(--text-muted)",
                  padding: 0,
                }}
              >
                <ThumbsDown size={12} />
                {comment.dislikeCount}
              </button>
              {!isReply && (
                <button
                  type="button"
                  onClick={() => onReply(comment.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 12,
                    color: "var(--text-muted)",
                    padding: 0,
                  }}
                >
                  <MessageSquare size={12} />
                  Reply
                </button>
              )}
              {canPin && (
                <button
                  type="button"
                  onClick={() => onPin(comment.id, !comment.isPinned)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 12,
                    color: "var(--text-muted)",
                    padding: 0,
                  }}
                >
                  <Pin size={12} />
                  {comment.isPinned ? "Unpin" : "Pin"}
                </button>
              )}
              <button
                type="button"
                onClick={() => onReport(comment.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 12,
                  color: "var(--text-muted)",
                  padding: 0,
                }}
              >
                <Flag size={12} />
                Report
              </button>
            </div>
          )}
        </div>
      </div>
      {comment.replies?.length > 0 && (
        <div style={{ marginTop: 8 }}>
          {comment.replies.map((r) => (
            <SingleComment
              key={r.id}
              comment={r as CommentItem}
              scriptAuthorId={scriptAuthorId}
              currentUserId={currentUserId}
              onVote={onVote}
              onReply={onReply}
              onPin={onPin}
              onReport={onReport}
              isReply
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CommentsSection({
  scriptId,
  scriptAuthorId,
  initialCommentCount,
}: {
  scriptId: string;
  scriptAuthorId: string;
  initialCommentCount: number;
}) {
  const user = useAuthStore((s) => s.user);
  const toast = useToast();
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [sort, setSort] = useState<"top" | "new">("top");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [submitReply, setSubmitReply] = useState(false);
  const [newCommentsFromRealtime, setNewCommentsFromRealtime] = useState<CommentItem[]>([]);
  const [newCommentBody, setNewCommentBody] = useState("");
  const [postingNew, setPostingNew] = useState(false);
  const [reportCommentId, setReportCommentId] = useState<string | null>(null);
  const channelRef = useRef<{ unsubscribe: () => void } | null>(null);

  const fetchComments = useCallback(
    async (cursor?: string | null, append = false) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      try {
        const params = new URLSearchParams({ sort, limit: "20" });
        if (cursor) params.set("cursor", cursor);
        const res = await apiFetch<{ comments: CommentItem[]; nextCursor: string | null }>(
          `/api/v1/scripts/${scriptId}/comments?${params}`
        );
        if (append) {
          setComments((prev) => [...prev, ...res.comments]);
        } else {
          setComments(res.comments);
        }
        setNextCursor(res.nextCursor);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [scriptId, sort]
  );

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return;
    let cancelled = false;
    import("@supabase/supabase-js").then(({ createClient }) => {
      if (cancelled) return;
      const supabase = createClient(url, key);
      const channel = supabase.channel(`script:${scriptId}:comments`);
      channel.on("broadcast", { event: "new_comment" }, (payload: { payload: CommentItem }) => {
        if (!cancelled) setNewCommentsFromRealtime((prev) => [payload.payload, ...prev]);
      });
      channel.subscribe();
      if (cancelled) {
        channel.unsubscribe();
        return;
      }
      channelRef.current = { unsubscribe: () => { channel.unsubscribe(); } };
    });
    return () => {
      cancelled = true;
      channelRef.current?.unsubscribe();
    };
  }, [scriptId]);

  const handleVote = useCallback(async (commentId: string, value: number) => {
    if (!user) return;
    try {
      const res = await apiFetch<{ likeCount: number; dislikeCount: number; userVote: number | null }>(
        `/api/v1/comments/${commentId}/vote`,
        { method: "POST", body: JSON.stringify({ value }) }
      );
      setComments((prev) =>
        prev.map((c) => {
          if (c.id === commentId) return { ...c, likeCount: res.likeCount, dislikeCount: res.dislikeCount, userVote: res.userVote };
          return {
            ...c,
            replies: c.replies?.map((r) =>
              r.id === commentId ? { ...r, likeCount: res.likeCount, dislikeCount: res.dislikeCount, userVote: res.userVote } : r
            ) ?? [],
          };
        })
      );
      setNewCommentsFromRealtime((prev) =>
        prev.map((c) => {
          if (c.id === commentId) return { ...c, likeCount: res.likeCount, dislikeCount: res.dislikeCount, userVote: res.userVote };
          return {
            ...c,
            replies: c.replies?.map((r) =>
              r.id === commentId ? { ...r, likeCount: res.likeCount, dislikeCount: res.dislikeCount, userVote: res.userVote } : r
            ) ?? [],
          };
        })
      );
    } catch {
      toast("Failed to vote. Please try again.");
    }
  }, [user, toast]);

  const handlePin = useCallback(async (commentId: string, isPinned: boolean) => {
    if (!user) return;
    try {
      await apiFetch(`/api/v1/comments/${commentId}/pin`, {
        method: "PATCH",
        body: JSON.stringify({ isPinned }),
      });
      await fetchComments();
    } catch {
      toast("Failed to pin comment. Please try again.");
    }
  }, [user, fetchComments, toast]);

  const handlePostNewComment = useCallback(async () => {
    if (!newCommentBody.trim() || !user) return;
    setPostingNew(true);
    try {
      const created = await apiFetch<CommentItem>(`/api/v1/scripts/${scriptId}/comments`, {
        method: "POST",
        body: JSON.stringify({ body: newCommentBody.trim() }),
      });
      setNewCommentBody("");
      setNewCommentsFromRealtime((prev) => [created, ...prev]);
    } catch {
      toast("Failed to post comment. Please try again.");
    } finally {
      setPostingNew(false);
    }
  }, [scriptId, newCommentBody, user, toast]);

  const handleSubmitReply = useCallback(async () => {
    if (!replyToId || !replyBody.trim() || !user) return;
    setSubmitReply(true);
    try {
      await apiFetch(`/api/v1/scripts/${scriptId}/comments`, {
        method: "POST",
        body: JSON.stringify({ body: replyBody.trim(), parentId: replyToId }),
      });
      setReplyToId(null);
      setReplyBody("");
      await fetchComments();
    } catch {
      toast("Failed to post reply. Please try again.");
    } finally {
      setSubmitReply(false);
    }
  }, [scriptId, replyToId, replyBody, user, fetchComments, toast]);

  const totalCount = initialCommentCount;
  const displayComments = [
    ...newCommentsFromRealtime,
    ...comments.filter((c) => !newCommentsFromRealtime.some((n) => n.id === c.id)),
  ];

  return (
    <section style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid var(--border)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
          Comments {totalCount > 0 && `(${totalCount})`}
        </h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => setSort("top")}
            style={{
              fontSize: 12,
              fontWeight: 600,
              padding: "5px 12px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)",
              background: sort === "top" ? "var(--accent)" : "var(--bg-surface)",
              color: sort === "top" ? "var(--accent-text)" : "var(--text-secondary)",
              cursor: "pointer",
            }}
          >
            Top by likes
          </button>
          <button
            type="button"
            onClick={() => setSort("new")}
            style={{
              fontSize: 12,
              fontWeight: 600,
              padding: "5px 12px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)",
              background: sort === "new" ? "var(--accent)" : "var(--bg-surface)",
              color: sort === "new" ? "var(--accent-text)" : "var(--text-secondary)",
              cursor: "pointer",
            }}
          >
            New by date
          </button>
        </div>
      </div>

      {user && !replyToId && (
        <div style={{ marginBottom: 16 }}>
          <textarea
            value={newCommentBody}
            onChange={(e) => setNewCommentBody(e.target.value)}
            placeholder="Add a comment..."
            maxLength={2000}
            rows={3}
            style={{
              width: "100%",
              padding: "10px 12px",
              fontSize: 13,
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              resize: "vertical",
            }}
          />
          <button
            type="button"
            onClick={handlePostNewComment}
            disabled={postingNew || !newCommentBody.trim()}
            style={{
              marginTop: 8,
              fontSize: 12,
              padding: "6px 14px",
              background: "var(--accent)",
              color: "var(--accent-text)",
              border: "none",
              borderRadius: "var(--radius-sm)",
              cursor: postingNew ? "not-allowed" : "pointer",
              fontWeight: 600,
            }}
          >
            {postingNew ? "Posting..." : "Post comment"}
          </button>
        </div>
      )}

      {user && replyToId && (
        <div style={{ marginBottom: 16 }}>
          <textarea
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            placeholder="Write a reply..."
            maxLength={2000}
            rows={3}
            style={{
              width: "100%",
              padding: "10px 12px",
              fontSize: 13,
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              resize: "vertical",
            }}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button
              type="button"
              onClick={() => { setReplyToId(null); setReplyBody(""); }}
              style={{ fontSize: 12, padding: "6px 12px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--bg-surface)", cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmitReply}
              disabled={submitReply || !replyBody.trim()}
              style={{ fontSize: 12, padding: "6px 12px", background: "var(--accent)", color: "var(--accent-text)", border: "none", borderRadius: "var(--radius-sm)", cursor: "pointer" }}
            >
              {submitReply ? "Posting..." : "Post Reply"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 24, color: "var(--text-muted)" }}>
          <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
          Loading comments...
        </div>
      ) : (
        <>
          {displayComments.map((c, i) => {
            const isNewFromRealtime = i < newCommentsFromRealtime.length;
            const el = (
              <SingleComment
                key={c.id}
                comment={c}
                scriptAuthorId={scriptAuthorId}
                currentUserId={user?.id ?? null}
                onVote={handleVote}
                onReply={setReplyToId}
                onPin={handlePin}
                onReport={(id) => setReportCommentId(id)}
              />
            );
            return isNewFromRealtime ? (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
              >
                {el}
              </motion.div>
            ) : (
              el
            );
          })}
          {nextCursor && (
            <div style={{ marginTop: 16, textAlign: "center" }}>
              <button
                type="button"
                onClick={() => fetchComments(nextCursor, true)}
                disabled={loadingMore}
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  padding: "8px 20px",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  background: "var(--bg-surface)",
                  color: "var(--text-primary)",
                  cursor: loadingMore ? "not-allowed" : "pointer",
                }}
              >
                {loadingMore ? "Loading..." : "Load more"}
              </button>
            </div>
          )}
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <ReportModal
        open={Boolean(reportCommentId)}
        targetType="COMMENT"
        targetId={reportCommentId}
        onClose={() => setReportCommentId(null)}
        onError={() => toast("Failed to submit report. Please try again.")}
      />
    </section>
  );
}
