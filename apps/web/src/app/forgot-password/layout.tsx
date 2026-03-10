import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Forgot Password — Scriptify",
  description: "Reset your Scriptify account password.",
};

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
