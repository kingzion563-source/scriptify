import type { Metadata } from "next";
import { ErrorScreen } from "@/components/ErrorScreen";

export const metadata: Metadata = {
  title: "403 Forbidden — Scriptify",
};

export default function ForbiddenPage() {
  return (
    <ErrorScreen
      heading="You're not supposed to be here. Yet."
      action={{ label: "Sign In", href: "/login" }}
    />
  );
}

