"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useCallback, useSyncExternalStore } from "react";
import { motion } from "framer-motion";
function usePrefersReducedMotion() {
    return useSyncExternalStore((cb) => {
        if (typeof window === "undefined")
            return () => { };
        const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
        mql.addEventListener("change", cb);
        return () => mql.removeEventListener("change", cb);
    }, () => typeof window !== "undefined"
        ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
        : false, () => false);
}
const STATUS_STYLES = {
    verified: {
        bg: "var(--status-bg-verified)",
        color: "var(--status-verified)",
    },
    patched: {
        bg: "var(--status-bg-patched)",
        color: "var(--status-patched)",
    },
    testing: {
        bg: "var(--status-bg-testing)",
        color: "var(--status-testing)",
    },
};
function getCardVariants(reducedMotion) {
    const duration = reducedMotion ? 0 : 0.26;
    const delay = reducedMotion ? 0 : undefined;
    return {
        hidden: { opacity: 0, y: 8 },
        visible: (i) => ({
            opacity: 1,
            y: 0,
            transition: {
                duration,
                ease: [0.16, 1, 0.3, 1],
                delay: delay !== undefined ? (i !== null && i !== void 0 ? i : 0) * 0.025 : 0,
            },
        }),
    };
}
export function ScriptCard({ id, title, coverUrl, gameName, gameSlug, authorUsername, authorAvatar, status, likeCount, viewCount, copyCount, tags, rawCode, aiScore, isAuthorPro, index = 0, }) {
    const [copied, setCopied] = useState(false);
    const [cardHovered, setCardHovered] = useState(false);
    const prefersReducedMotion = usePrefersReducedMotion();
    const cardVariants = getCardVariants(prefersReducedMotion);
    const handleCopy = useCallback(() => {
        if (copied)
            return;
        navigator.clipboard.writeText(rawCode).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }, [rawCode, copied]);
    const statusStyle = STATUS_STYLES[status];
    const statusLabel = status.toUpperCase();
    return (_jsxs(motion.article, { layout: true, initial: "hidden", animate: "visible", variants: cardVariants, custom: index, className: "script-card", style: {
            display: "flex",
            flexDirection: "column",
            background: "var(--bg-surface)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border)",
            overflow: "hidden",
        }, whileHover: prefersReducedMotion
            ? undefined
            : {
                y: -2,
                transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] },
            }, onHoverStart: () => setCardHovered(true), onHoverEnd: () => setCardHovered(false), children: [_jsxs("div", { className: "script-card-cover", style: {
                    position: "relative",
                    width: "100%",
                    aspectRatio: "16 / 9",
                    overflow: "hidden",
                    background: "var(--bg-surface-2)",
                }, children: [coverUrl ? (_jsx(motion.img, { src: coverUrl, alt: "", style: {
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                        }, animate: {
                            scale: prefersReducedMotion ? 1 : cardHovered ? 1.03 : 1,
                        }, transition: {
                            duration: prefersReducedMotion ? 0 : 0.3,
                            ease: "easeInOut",
                        } })) : (_jsx("div", { style: {
                            width: "100%",
                            height: "100%",
                            background: "var(--bg-surface-2)",
                        } })), _jsx("span", { style: {
                            position: "absolute",
                            top: 8,
                            left: 8,
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                            padding: "3px 7px",
                            borderRadius: 4,
                            background: statusStyle.bg,
                            color: statusStyle.color,
                        }, children: statusLabel })] }), _jsxs("div", { style: {
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    padding: "12px 14px 14px",
                }, children: [_jsx("h3", { style: {
                            fontSize: 14,
                            fontWeight: 600,
                            color: "var(--text-primary)",
                            lineHeight: 1.35,
                            margin: 0,
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                        }, children: title }), _jsx("p", { style: {
                            fontSize: 12,
                            color: "var(--text-secondary)",
                            margin: 0,
                        }, children: gameName }), tags.length > 0 && (_jsx("div", { style: {
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 4,
                        }, children: tags.map((tag) => (_jsx("span", { style: {
                                fontSize: 11,
                                padding: "2px 7px",
                                background: "var(--bg-surface-2)",
                                border: "1px solid var(--border)",
                                borderRadius: 4,
                                color: "var(--text-primary)",
                            }, children: tag }, tag))) })), _jsxs("div", { style: {
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginTop: "auto",
                            paddingTop: 8,
                            borderTop: "1px solid var(--border)",
                        }, children: [_jsx("span", { style: {
                                    fontSize: 11,
                                    color: "var(--text-muted)",
                                }, children: authorUsername }), _jsxs("div", { style: {
                                    display: "flex",
                                    gap: 10,
                                    fontSize: 11,
                                    color: "var(--text-muted)",
                                }, children: [_jsx("span", { children: likeCount }), _jsx("span", { children: viewCount }), _jsx("span", { children: copyCount })] }), _jsx("button", { type: "button", onClick: handleCopy, style: {
                                    background: copied ? "var(--status-verified)" : "var(--accent)",
                                    color: "var(--accent-text)",
                                    border: "none",
                                    padding: "5px 10px",
                                    borderRadius: 4,
                                    fontSize: 11,
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    transition: "background 100ms",
                                }, onMouseEnter: (e) => {
                                    if (!copied)
                                        e.currentTarget.style.background = "var(--accent-hover)";
                                }, onMouseLeave: (e) => {
                                    if (!copied)
                                        e.currentTarget.style.background = "var(--accent)";
                                }, onMouseDown: (e) => {
                                    e.currentTarget.style.transform = "scale(0.96)";
                                }, onMouseUp: (e) => {
                                    e.currentTarget.style.transform = "scale(1)";
                                }, children: copied ? "Copied!" : "Copy" })] })] })] }));
}
