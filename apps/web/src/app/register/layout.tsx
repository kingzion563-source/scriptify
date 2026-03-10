import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account — Scriptify",
  description: "Join Scriptify and share free Roblox Lua scripts.",
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
