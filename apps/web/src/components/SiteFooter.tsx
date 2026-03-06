import Link from "next/link";

export function SiteFooter() {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--border)",
        padding: "14px 20px",
        marginTop: 24,
        fontSize: 12,
        color: "var(--text-muted)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Link href="/copyright" style={{ color: "var(--text-muted)", textDecoration: "none" }}>
        © {new Date().getFullYear()} Scriptify
      </Link>
      <nav style={{ display: "flex", gap: 12 }}>
        <Link href="/rules" style={{ color: "var(--text-muted)", textDecoration: "none" }}>
          Rules
        </Link>
        <Link href="/privacy" style={{ color: "var(--text-muted)", textDecoration: "none" }}>
          Privacy
        </Link>
        <Link href="/terms" style={{ color: "var(--text-muted)", textDecoration: "none" }}>
          Terms
        </Link>
      </nav>
    </footer>
  );
}
