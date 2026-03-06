import type { Metadata } from "next";
import { ProPageClient } from "./ProPageClient";

export const metadata: Metadata = {
  title: "Scriptify Pro — Unlock the full experience",
  description: "Get Trending Boost, Pro badge, advanced analytics, and more.",
};

interface PageProps {
  searchParams: Promise<{ success?: string; canceled?: string }>;
}

export default async function ProPage({ searchParams }: PageProps) {
  const params = await searchParams;
  return (
    <ProPageClient
      success={params.success === "1"}
      canceled={params.canceled === "1"}
    />
  );
}
