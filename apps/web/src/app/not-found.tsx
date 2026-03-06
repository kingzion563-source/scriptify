import { ErrorScreen } from "@/components/ErrorScreen";

export default function NotFoundPage() {
  return (
    <ErrorScreen
      heading="That script's gone. Patched, maybe."
      action={{ label: "Back to Discover", href: "/" }}
    />
  );
}

