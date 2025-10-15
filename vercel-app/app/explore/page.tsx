"use client";

import RequireAuth from "@/components/RequireAuth";

export default function ExplorePage() {
  return (
    <RequireAuth>
      <div className="min-h-screen bg-white">
        {/* Header */}
        <header className="border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
            <a href="/" className="flex items-center gap-1.5 sm:gap-2 hover:opacity-80 transition-opacity">
              <span className="text-xl sm:text-2xl" aria-hidden>🌊</span>
              <span className="text-xl sm:text-2xl font-bold text-slate-900">TideFly</span>
            </a>
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
            <div className="flex items-center gap-2 sm:gap-3">
              <a
                href="/alerts"
                className="text-sm sm:text-base text-slate-700 hover:text-slate-900 transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
              >
                Dashboard
              </a>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="space-y-6 sm:space-y-8">
            {/* Header */}
            <div>
              <a
                href="/alerts"
                className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900 transition-colors duration-200 ease-out mb-4"
              >
                ← Back to alerts
              </a>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Explore Spots</h1>
              <p className="mt-2 text-sm md:text-lg text-slate-600">
                Discover amazing surf spots around the world
              </p>
            </div>

            {/* Placeholder Content */}
            <div className="text-center py-12">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-sky-100 grid place-items-center">
                <span className="text-2xl" aria-hidden>📍</span>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Sneak Peek</h3>
              <p className="text-slate-600">
                Discover surf destinations on a map and let TideFly 'surprise you' within your budget. Pro users get early access.
              </p>
            </div>
          </div>
        </main>
      </div>
    </RequireAuth>
  );
}
