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
      <div className="min-h-screen bg-white">
        {/* Header */}
        <header className="border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 rounded">
              <span className="text-2xl" aria-hidden>🌊</span>
              <div className="text-2xl font-bold text-slate-900">TideFly</div>
            </a>
            <div className="flex items-center gap-3">
              <a
                href="/alerts"
                className="text-slate-700 hover:text-slate-900 transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
              >
                Dashboard
              </a>
              <SignOutButton />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          {children}
        </main>
      </div>
    </RequireAuth>
  );
}
