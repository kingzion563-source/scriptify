import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In — Scriptify",
  description: "Sign in to your Scriptify account.",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
