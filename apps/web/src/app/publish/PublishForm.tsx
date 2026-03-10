"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useSyncExternalStore,
} from "react";
import { useRouter } from "next/navigation";
import Turnstile from "react-turnstile";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { Upload, X, Users, Loader2 } from "lucide-react";
import { ScriptCard } from "@scriptify/ui";
import { apiFetch, getApiUrl } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { useDebounce } from "@/lib/useDebounce";

const EXECUTORS = [
  "Synapse Z",
  "Wave",
  "Solara",
  "Fluxus",
  "Delta",
  "Krnl",
  "Xeno",
  "Arceus X",
  "Hydrogen",
  "Codex",
];

const MAX_TITLE = 80;
const MAX_DESC = 2000;
const MAX_TAG_LEN = 30;
const MAX_TAGS = 10;

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (cb) => {
      if (typeof window === "undefined") return () => {};
      const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
      mql.addEventListener("change", cb);
      return () => mql.removeEventListener("change", cb);
    },
    () =>
      typeof window !== "undefined"
        ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
        : false,
    () => false
  );
}

export default function PublishForm() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const prefersReducedMotion = usePrefersReducedMotion();

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [gameId, setGameId] = useState<string | null>(null);
  const [gameSearch, setGameSearch] = useState("");
  const [gameOpen, setGameOpen] = useState(false);
  const [games, setGames] = useState<Array<{ id: string; name: string; slug: string; thumbnailUrl: string | null; playerCountCached: number }>>([]);
  const [description, setDescription] = useState("");
  const [descriptionView, setDescriptionView] = useState<"raw" | "rendered">("raw");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [tagSuggestions, setTagSuggestions] = useState<Array<{ name: string }>>([]);
  const [executorMode, setExecutorMode] = useState<"auto" | "manual">("auto");
  const [executorCompat, setExecutorCompat] = useState<Record<string, boolean | null>>(
    Object.fromEntries(EXECUTORS.map((e) => [e, null]))
  );
  const [platform, setPlatform] = useState<"PC" | "MOBILE" | "BOTH">("BOTH");
  const [rawCode, setRawCode] = useState("");
  const debouncedCode = useDebounce(rawCode, 800);
  const [confirmation, setConfirmation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<unknown>(null);
  const [aiStreamingText, setAiStreamingText] = useState<string>("");
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [submitDisabled, setSubmitDisabled] = useState<boolean>(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const debouncedPreview = useDebounce(
    { title, description, tags, rawCode, coverPreview, gameId, games },
    300
  );

  // Gate: redirect if not logged in
  useEffect(() => {
    if (user === null) {
      router.replace("/login?return=/publish");
    }
  }, [user, router]);

  // Cover file preview
  useEffect(() => {
    if (!coverFile) {
      setCoverPreview(null);
      return;
    }
    const url = URL.createObjectURL(coverFile);
    setCoverPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [coverFile]);

  // Game search
  useEffect(() => {
    if (!gameSearch.trim()) {
      setGames([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch<unknown[]>(
          `/api/v1/games?q=${encodeURIComponent(gameSearch)}`
        );
        if (!cancelled && Array.isArray(data)) setGames(data as any);
      } catch {
        if (!cancelled) setGames([]);
      }
    })();
    return () => { cancelled = true; };
  }, [gameSearch]);

  // Tag suggestions
  useEffect(() => {
    if (!tagInput.trim()) {
      setTagSuggestions([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch<unknown[]>(
          `/api/v1/tags?q=${encodeURIComponent(tagInput)}`
        );
        if (!cancelled && Array.isArray(data)) setTagSuggestions(data as any);
      } catch {
        if (!cancelled) setTagSuggestions([]);
      }
    })();
    return () => { cancelled = true; };
  }, [tagInput]);

  const addTag = useCallback((tag: string) => {
    const t = tag.trim().slice(0, MAX_TAG_LEN);
    if (!t || tags.length >= MAX_TAGS || tags.includes(t)) return;
    setTags((prev) => [...prev, t]);
    setTagInput("");
    setTagSuggestions([]);
  }, [tags]);

  const removeTag = useCallback((tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  }, []);

  const handleTagKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        const v = (e.key === "," ? tagInput.replace(/,/g, "") : tagInput).trim();
        if (v) addTag(v);
      }
    },
    [tagInput, addTag]
  );

  const selectedGame = gameId ? games.find((g) => g.id === gameId) : null;

  const submittingRef = useRef(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user) return;
      if (submittingRef.current) return;
      submittingRef.current = true;

      setSubmitting(true);
      try {
        let coverUrl: string | undefined;
        if (coverFile) {
          const form = new FormData();
          form.append("file", coverFile);
          const uploadHeaders: Record<string, string> = {};
          const uploadToken = useAuthStore.getState().accessToken;
          if (uploadToken) uploadHeaders["Authorization"] = `Bearer ${uploadToken}`;
          const uploadRes = await fetch(getApiUrl("/api/v1/uploads/cover"), {
            method: "POST",
            credentials: "include",
            headers: uploadHeaders,
            body: form,
          });
          if (!uploadRes.ok) {
            const err = await uploadRes.json().catch(() => ({})) as { error?: string; message?: string };
            throw new Error(err.error || err.message || "Cover upload failed");
          }
          const uploadData = await uploadRes.json() as { url: string };
          coverUrl = uploadData.url;
        }

        const payload = {
          title: title.slice(0, MAX_TITLE),
          description: description.slice(0, MAX_DESC) || undefined,
          coverUrl,
          gameId: gameId || undefined,
          tags,
          executorCompat:
            executorMode === "auto"
              ? "auto"
              : EXECUTORS.map((name) => ({
                  name,
                  compatible: executorCompat[name] ?? null,
                })),
          platform,
          rawCode,
          confirmation,
          turnstileToken,
        };
        const result = await apiFetch<{ slug: string }>("/api/v1/scripts", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setToast("Script published successfully.");
        setTimeout(() => {
          router.push(`/script/${result.slug}`);
          router.refresh();
        }, 800);
      } catch (err) {
        setToast(err instanceof Error ? err.message : "Publish failed");
        setTimeout(() => setToast(null), 4000);
      } finally {
        setSubmitting(false);
        submittingRef.current = false;
      }
    },
    [user, title, description, gameId, tags, executorMode, executorCompat, platform, rawCode, confirmation, coverFile, turnstileToken, router]
  );

  if (!isHydrated) {
    return (
      <>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--bg-page, #fff)",
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              border: "3px solid var(--border)",
              borderTopColor: "var(--accent)",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
        </div>
      </>
    );
  }
  if (user === null) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
          Redirecting to sign in...
        </p>
      </div>
    );
  }

  const previewGame = selectedGame
    ? { name: selectedGame.name, slug: selectedGame.slug }
    : { name: "Unknown", slug: "" };

  return (
    <div style={{ padding: "24px 20px" }}>
      {toast && (
        <div
          role="status"
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            padding: "12px 20px",
            background: "var(--text-primary)",
            color: "var(--text-inverse)",
            borderRadius: "var(--radius-md)",
            fontSize: 13,
            fontWeight: 500,
            zIndex: 1000,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          }}
        >
          {toast}
        </div>
      )}

      <h1
        style={{
          fontSize: 20,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          color: "var(--text-primary)",
          margin: "0 0 6px",
        }}
      >
        Publish a Script
      </h1>
      <p
        style={{
          fontSize: 13,
          color: "var(--text-secondary)",
          margin: "0 0 24px",
        }}
      >
        All scripts are free.
      </p>

      <div
        className="publish-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "60% 40%",
          gap: 32,
          alignItems: "start",
        }}
      >
        <form onSubmit={handleSubmit} style={{ minWidth: 0 }}>
          {/* 1. Cover Art */}
          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-primary)",
                marginBottom: 6,
              }}
            >
              Cover Art
            </label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.style.background = "var(--bg-surface-3)";
              }}
              onDragLeave={(e) => {
                e.currentTarget.style.background = "var(--bg-surface-2)";
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.style.background = "var(--bg-surface-2)";
                const f = e.dataTransfer.files[0];
                if (f && /^image\/(jpeg|png|webp)$/i.test(f.type) && f.size <= 2 * 1024 * 1024) {
                  setCoverFile(f);
                }
              }}
              onClick={() => document.getElementById("cover-input")?.click()}
              style={{
                border: "2px dashed var(--border)",
                borderRadius: "var(--radius-md)",
                padding: "32px 24px",
                textAlign: "center",
                background: "var(--bg-surface-2)",
                cursor: "pointer",
                transition: "background 100ms",
              }}
            >
              <input
                id="cover-input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const validTypes = ["image/jpeg", "image/png", "image/webp"];
                  if (!validTypes.includes(f.type)) {
                    setToast("Only JPG, PNG, and WebP images are allowed.");
                    setTimeout(() => setToast(null), 4000);
                    return;
                  }
                  if (f.size <= 2 * 1024 * 1024) setCoverFile(f);
                }}
              />
              {coverPreview ? (
                <div style={{ marginBottom: 8 }}>
                  <img
                    src={coverPreview}
                    alt="Cover preview"
                    style={{
                      maxWidth: "100%",
                      maxHeight: 120,
                      objectFit: "contain",
                      borderRadius: "var(--radius-sm)",
                    }}
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCoverFile(null);
                    }}
                    style={{
                      marginTop: 6,
                      fontSize: 11,
                      color: "var(--text-muted)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <>
                  <Upload size={24} style={{ color: "var(--text-muted)", marginBottom: 8 }} />
                  <p style={{ fontSize: 13, color: "var(--text-primary)", margin: "0 0 4px" }}>
                    Click or drag image to upload
                  </p>
                  <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    1:1 Aspect Ratio recommended. Max 2MB, JPG PNG WebP.
                  </p>
                </>
              )}
            </div>
          </div>

          {/* 2. Script Title */}
          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-primary)",
                marginBottom: 6,
              }}
            >
              Script Title
            </label>
            <input
              type="text"
              maxLength={MAX_TITLE}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My Awesome Script"
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: 13,
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                background: "var(--bg-surface)",
                color: "var(--text-primary)",
              }}
            />
            <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
              {title.length}/{MAX_TITLE}
            </p>
          </div>

          {/* 3. Target Game */}
          <div style={{ marginBottom: 24, position: "relative" }}>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-primary)",
                marginBottom: 6,
              }}
            >
              Target Game
            </label>
            <div>
              <input
                type="text"
                value={gameSearch}
                onChange={(e) => {
                  setGameSearch(e.target.value);
                  if (!e.target.value) setGameId(null);
                  setGameOpen(true);
                }}
                onFocus={() => setGameOpen(true)}
                placeholder="Search games..."
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  fontSize: 13,
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  background: "var(--bg-surface)",
                  color: "var(--text-primary)",
                }}
              />
              {selectedGame && !gameSearch && (
                <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 6 }}>
                  Selected: {selectedGame.name}
                </p>
              )}
              {gameOpen && (
                <>
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      marginTop: 4,
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)",
                      maxHeight: 280,
                      overflowY: "auto",
                      zIndex: 50,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                    }}
                  >
                    {games.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => {
                          setGameId(g.id);
                          setGameSearch(g.name);
                          setGameOpen(false);
                        }}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "10px 12px",
                          border: "none",
                          background: "none",
                          cursor: "pointer",
                          textAlign: "left",
                          fontSize: 13,
                          color: "var(--text-primary)",
                        }}
                      >
                        {g.thumbnailUrl && (
                          <img
                            src={g.thumbnailUrl}
                            alt=""
                            style={{
                              width: 40,
                              height: 40,
                              objectFit: "cover",
                              borderRadius: "var(--radius-sm)",
                            }}
                          />
                        )}
                        <div>
                          <div style={{ fontWeight: 500 }}>{g.name}</div>
                          <div
                            style={{
                              fontSize: 11,
                              color: "var(--text-muted)",
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <Users size={10} />
                            {g.playerCountCached.toLocaleString()} players
                          </div>
                        </div>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setGameOpen(false)}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderTop: "1px solid var(--border)",
                        background: "var(--bg-surface-2)",
                        fontSize: 12,
                        color: "var(--text-secondary)",
                        cursor: "pointer",
                      }}
                    >
                      Add new game
                    </button>
                  </div>
                  <div
                    style={{ position: "fixed", inset: 0, zIndex: 40 }}
                    onClick={() => setGameOpen(false)}
                    aria-hidden
                  />
                </>
              )}
            </div>
          </div>

          {/* 4. Description */}
          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-primary)",
                marginBottom: 6,
              }}
            >
              Description
            </label>
            <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
              <button
                type="button"
                onClick={() => setDescriptionView("raw")}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "4px 10px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                  background: descriptionView === "raw" ? "var(--bg-surface-3)" : "var(--bg-surface)",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                }}
              >
                Raw
              </button>
              <button
                type="button"
                onClick={() => setDescriptionView("rendered")}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "4px 10px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                  background: descriptionView === "rendered" ? "var(--bg-surface-3)" : "var(--bg-surface)",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                }}
              >
                Rendered
              </button>
            </div>
            {descriptionView === "raw" ? (
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={MAX_DESC}
                placeholder="Describe what your script does..."
                rows={6}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  fontSize: 13,
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  background: "var(--bg-surface)",
                  color: "var(--text-primary)",
                  resize: "vertical",
                }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  minHeight: 120,
                  padding: "10px 12px",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  background: "var(--bg-surface)",
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  lineHeight: 1.6,
                }}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
                  {description || "*No description*"}
                </ReactMarkdown>
              </div>
            )}
            <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
              {description.length}/{MAX_DESC}
            </p>
          </div>

          {/* 5. Tags */}
          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-primary)",
                marginBottom: 6,
              }}
            >
              Tags
            </label>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="Comma-separated, up to 10 tags, 30 chars each"
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: 13,
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                background: "var(--bg-surface)",
                color: "var(--text-primary)",
              }}
            />
            {tagSuggestions.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                {tagSuggestions
                  .filter((t) => !tags.includes(t.name))
                  .slice(0, 5)
                  .map((t) => (
                    <button
                      key={t.name}
                      type="button"
                      onClick={() => addTag(t.name)}
                      style={{
                        fontSize: 11,
                        padding: "3px 8px",
                        background: "var(--bg-surface-2)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-sm)",
                        color: "var(--text-secondary)",
                        cursor: "pointer",
                      }}
                    >
                      + {t.name}
                    </button>
                  ))}
                </div>
            )}
            {tags.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
                {tags.map((t) => (
                  <span
                    key={t}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 11,
                      padding: "3px 8px",
                      background: "var(--bg-surface-2)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-sm)",
                      color: "var(--text-primary)",
                    }}
                  >
                    {t}
                    <button
                      type="button"
                      onClick={() => removeTag(t)}
                      aria-label={`Remove ${t}`}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 6. Executor Compatibility */}
          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-primary)",
                marginBottom: 8,
              }}
            >
              Executor Compatibility
            </label>
            <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="executorMode"
                  checked={executorMode === "auto"}
                  onChange={() => setExecutorMode("auto")}
                />
                Auto-Detect
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="executorMode"
                  checked={executorMode === "manual"}
                  onChange={() => setExecutorMode("manual")}
                />
                Manual override
              </label>
            </div>
            {executorMode === "manual" && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {EXECUTORS.map((name) => (
                  <label
                    key={name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={executorCompat[name] === true}
                      onChange={(e) =>
                        setExecutorCompat((prev) => ({
                          ...prev,
                          [name]: e.target.checked ? true : null,
                        }))
                      }
                    />
                    {name}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* 7. Platform */}
          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-primary)",
                marginBottom: 8,
              }}
            >
              Platform
            </label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(["PC", "MOBILE", "BOTH"] as const).map((p) => (
                <label
                  key={p}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name="platform"
                    checked={platform === p}
                    onChange={() => setPlatform(p)}
                  />
                  {p === "BOTH" ? "PC and Mobile" : p === "PC" ? "PC only" : "Mobile only"}
                </label>
              ))}
            </div>
          </div>

          {/* 8. Source Code */}
          <div style={{ marginBottom: 24 }}>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Source Code (Lua)</label>
            <textarea
              value={rawCode}
              onChange={(e) => setRawCode(e.target.value)}
              placeholder="Paste your Lua script here..."
              rows={16}
              className="w-full border border-gray-200 rounded-lg p-4 font-mono text-sm resize-y focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          {/* 9. Confirmation */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer", fontSize: 13, color: "var(--text-primary)" }}>
              <input
                type="checkbox"
                checked={confirmation}
                onChange={(e) => setConfirmation(e.target.checked)}
                required
              />
              <span>
                I confirm this script does not contain malware, stolen code, or data exfiltration.
              </span>
            </label>
          </div>

          {/* Turnstile */}
          {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
            <div style={{ marginBottom: 24 }}>
              <Turnstile
                sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""}
                onVerify={(token) => setTurnstileToken(token)}
              />
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || !confirmation || !rawCode.trim()}
            style={{
              width: "100%",
              height: 44,
              background: "var(--accent)",
              color: "var(--accent-text)",
              border: "none",
              borderRadius: "var(--radius-md)",
              fontSize: 14,
              fontWeight: 600,
              cursor: submitting ? "not-allowed" : "pointer",
              opacity: submitting ? 0.7 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {submitting ? (
              <>
                <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
                Publishing...
              </>
            ) : (
              "Publish Script"
            )}
          </button>
        </form>

        {/* Right: Preview */}
        <aside
          style={{
            position: "sticky",
            top: 72,
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            overflow: "hidden",
            background: "var(--bg-surface)",
          }}
        >
          <div
            style={{
              padding: "8px 12px",
              borderBottom: "1px solid var(--border)",
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.08em",
              color: "var(--text-muted)",
              textTransform: "uppercase",
            }}
          >
            PREVIEW
          </div>
          <div style={{ padding: 12 }}>
            <ScriptCard
              id="preview"
              title={debouncedPreview.title || "Script title"}
              coverUrl={coverPreview ?? debouncedPreview.coverPreview}
              gameName={previewGame.name}
              gameSlug={previewGame.slug}
              authorUsername={user?.username ?? ""}
              authorAvatar={user?.avatarUrl ?? null}
              status="verified"
              likeCount={0}
              viewCount={0}
              copyCount={0}
              tags={debouncedPreview.tags}
              rawCode={debouncedPreview.rawCode || ""}
              index={0}
            />
          </div>
        </aside>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .publish-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
