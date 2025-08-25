"use client";

import RequireAuth from "@/components/RequireAuth";
import SignOutButton from "@/components/SignOutButton";

export default function AlertsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      <div style={{ maxWidth: 900, margin: "24px auto", padding: "0 16px" }}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <h1 style={{ fontSize: 20, margin: 0 }}>TideFly</h1>
          <nav style={{ display: "flex", gap: 12 }}>
            <a href="/alerts">Alerts</a>
            <a href="/alerts/new">New alert</a>
            <SignOutButton />
          </nav>
        </header>
        {children}
      </div>
    </RequireAuth>
  );
}
