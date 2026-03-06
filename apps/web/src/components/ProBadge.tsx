export function ProBadge({ className }: { className?: string }) {
  return (
    <span
      className={className}
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        padding: "2px 6px",
        background: "var(--pro-gold-bg)",
        color: "var(--pro-gold)",
        border: "1px solid var(--pro-gold)",
        borderRadius: 4,
        flexShrink: 0,
        lineHeight: 1.4,
        display: "inline-block",
      }}
    >
      PRO
    </span>
  );
}
