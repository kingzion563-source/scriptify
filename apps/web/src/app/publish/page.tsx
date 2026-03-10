import type { Metadata } from "next";
import RequireAuth from "@/components/RequireAuth";
import PublishForm from "./PublishForm";

export const metadata: Metadata = {
  title: "Publish a Script — Scriptify",
  description: "Share your Roblox Lua script with the Scriptify community. All scripts are free.",
};

export default function PublishPage() {
  return (
    <RequireAuth>
      <PublishForm />
    </RequireAuth>
  );
}
