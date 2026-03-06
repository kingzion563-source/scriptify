import { ErrorScreen } from "@/components/ErrorScreen";

export default function ForbiddenPage() {
  return (
    <ErrorScreen
      heading="You're not supposed to be here. Yet."
      action={{ label: "Sign In", href: "/login" }}
    />
  );
}

