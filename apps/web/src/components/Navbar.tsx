"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Trending", href: "/trending" },
  { label: "Upload", href: "/publish" },
  { label: "Rules", href: "/rules" },
  { label: "Pro", href: "/pro" },
] as const;

export function Navbar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("click", onClickOutside);
    return () => document.removeEventListener("click", onClickOutside);
  }, []);

  return (
    <header
      style={{
        width: "100%",
        height: 56,
        background: "white",
        borderBottom: "1px solid #E4E4E4",
        position: "sticky",
        top: 0,
        zIndex: 100,
        fontFamily: "var(--font-space-grotesk), sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          paddingLeft: 20,
          paddingRight: 20,
          height: "100%",
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          gap: 16,
        }}
      >
        {/* Left: logo + SCRIPTIFY */}
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            textDecoration: "none",
            color: "inherit",
            justifySelf: "start",
          }}
        >
          <img
            src="/logo.png"
            alt="Scriptify"
            style={{ height: 28, width: "auto", display: "block" }}
          />
          <span
            style={{
              fontWeight: 700,
              fontSize: 15,
              color: "#111111",
              letterSpacing: "-0.02em",
            }}
          >
            SCRIPTIFY
          </span>
        </Link>

        {/* Center: nav links — column is auto-sized so links are never clipped */}
        <nav style={{ display: "flex", alignItems: "center", gap: 4, justifySelf: "center" }}>
          {NAV_LINKS.map(({ label, href }) => {
            const isActive =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className="rounded-md px-3 py-1.5 text-sm font-medium no-underline transition-colors hover:bg-[#F5F5F5] hover:text-[#111111]"
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: isActive ? "var(--accent-text)" : "#555555",
                  padding: "6px 12px",
                  borderRadius: 6,
                  textDecoration: "none",
                  background: isActive ? "var(--accent)" : "transparent",
                }}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Right: Sign In or avatar + username + dropdown */}
        <div style={{ display: "flex", alignItems: "center", justifySelf: "end" }}>
          {user ? (
            <div ref={dropdownRef} style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setDropdownOpen((o) => !o)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px 0",
                }}
              >
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt=""
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: "#E4E4E4",
                    }}
                  />
                )}
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: "#111111",
                  }}
                >
                  {user.username}
                </span>
              </button>
              {dropdownOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    marginTop: 4,
                    minWidth: 140,
                    background: "white",
                    border: "1px solid #E4E4E4",
                    borderRadius: 6,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                    zIndex: 200,
                    overflow: "hidden",
                  }}
                >
                  <Link
                    href={`/u/${user.username}`}
                    onClick={() => setDropdownOpen(false)}
                    style={{
                      display: "block",
                      padding: "10px 14px",
                      fontSize: 13,
                      color: "#111111",
                      textDecoration: "none",
                    }}
                  >
                    Profile
                  </Link>
                  <Link
                    href="/settings"
                    onClick={() => setDropdownOpen(false)}
                    style={{
                      display: "block",
                      padding: "10px 14px",
                      fontSize: 13,
                      color: "#111111",
                      textDecoration: "none",
                    }}
                  >
                    Settings
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      logout();
                    }}
                    style={{
                      display: "block",
                      width: "100%",
                      padding: "10px 14px",
                      fontSize: 13,
                      color: "#111111",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="inline-block rounded-md border px-4 py-1.5 text-[13px] font-semibold no-underline transition-colors hover:bg-[var(--accent)] hover:text-[var(--accent-text)]"
              style={{
                border: "1px solid var(--accent)",
                background: "white",
                color: "var(--accent)",
                fontSize: 13,
                fontWeight: 600,
                padding: "6px 16px",
                borderRadius: 6,
                cursor: "pointer",
                textDecoration: "none",
              }}
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
