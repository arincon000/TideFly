"use client";

import RequireAuth from "@/components/RequireAuth";

export default function SuggestionsPage() {
  return (
    <RequireAuth>
      <div className="min-h-screen bg-white">
        {/* Header */}
        <header className="border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl" aria-hidden>🌊</span>
              <div className="text-2xl font-bold text-slate-900">TideFly</div>
            </div>
            <nav className="hidden md:flex items-center gap-8">
              <a
                href="/#features"
                className="text-slate-700 hover:text-slate-900 transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
              >
                Features
              </a>
              <a
                href="/#pricing"
                className="text-slate-700 hover:text-slate-900 transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
              >
                Pricing
              </a>
              <a
                href="/#how-it-works"
                className="text-slate-700 hover:text-slate-900 transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
              >
                How it works
              </a>
            </nav>
            <div className="flex items-center gap-3">
              <a
                href="/alerts"
                className="text-slate-700 hover:text-slate-900 transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
              >
                Dashboard
              </a>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="space-y-8">
            {/* Header */}
            <div>
              <a
                href="/alerts"
                className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900 transition-colors duration-200 ease-out mb-4"
              >
                ← Back to alerts
              </a>
              <h1 className="text-3xl font-bold text-slate-900">Suggestions</h1>
              <p className="mt-2 text-lg text-slate-600">
                Get personalized surf trip recommendations
              </p>
            </div>

            {/* Placeholder Content */}
            <div className="text-center py-12">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-sky-100 grid place-items-center">
                <span className="text-2xl" aria-hidden>💡</span>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Coming Soon</h3>
              <p className="text-slate-600">
                The suggestions feature is currently under development. 
                You'll receive personalized recommendations for surf trips based on your preferences.
              </p>
            </div>
          </div>
        </main>
      </div>
    </RequireAuth>
  );
}
