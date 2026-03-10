import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search Scripts — Scriptify",
  description: "Search thousands of free Roblox Lua scripts on Scriptify.",
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
