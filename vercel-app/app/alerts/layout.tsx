"use client";

import RequireAuth from "@/components/RequireAuth";

export default function AlertsLayout({ children }: { children: React.ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>;
}
