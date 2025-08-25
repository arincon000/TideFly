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
      <div className="max-w-3xl mx-auto p-4">
        <header className="flex justify-between items-center mb-5">
          <h1 className="text-xl font-semibold">TideFly</h1>
          <nav className="flex gap-3">
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
