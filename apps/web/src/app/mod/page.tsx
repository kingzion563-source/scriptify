import type { Metadata } from "next";
import { ModPanelClient } from "./ModPanelClient";

export const metadata: Metadata = {
  title: "Moderation Panel — Scriptify",
  description: "Review reports, moderate scripts and users, and inspect audit logs.",
};

export default function ModPage() {
  return <ModPanelClient />;
}

