"use client";

import { ErrorScreen } from "@/components/ErrorScreen";

export default function ServerErrorPage() {
  return (
    <ErrorScreen
      heading="Our side. We are on it."
      action={{ label: "Reload", onClick: () => window.location.reload() }}
    />
  );
}

