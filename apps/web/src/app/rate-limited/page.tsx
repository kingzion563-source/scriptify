"use client";

import { useSearchParams } from "next/navigation";
import { ErrorScreen } from "@/components/ErrorScreen";

export default function RateLimitedPage() {
  const params = useSearchParams();
  const raw = Number(params.get("reset") ?? "0");
  const reset = Number.isFinite(raw) && raw > 0 ? (raw > 1e12 ? Math.floor(raw / 1000) : raw) : 0;

  return (
    <ErrorScreen
      heading="Easy. You are moving too fast."
      countdownTo={Number.isFinite(reset) && reset > 0 ? reset : undefined}
      action={{ label: "Reload", onClick: () => window.location.reload() }}
    />
  );
}

