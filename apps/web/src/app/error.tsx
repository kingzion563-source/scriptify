"use client";

import { useEffect } from "react";
import { ErrorScreen } from "@/components/ErrorScreen";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorScreen
      heading="Our side. We are on it."
      action={{ label: "Reload", onClick: () => window.location.reload() }}
    />
  );
}

