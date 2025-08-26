import Link from "next/link";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-50 via-white to-sky-50">
      <nav className="sticky top-0 z-50 bg-white/70 backdrop-blur border-b border-slate-200/60">
        <div className="max-w-6xl mx-auto h-16 px-6 flex items-center justify-between">
          <div className="text-xl font-extrabold text-sky-600">TideFly</div>
          <div className="hidden md:flex gap-8">
            <a href="#features" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              Features
            </a>
            <a href="#pricing" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              Pricing
            </a>
            <a href="#how-it-works" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              How it works
            </a>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              Sign in
            </Link>
            <Link
              href="/auth"
              className="rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>
      {children}
    </div>
  );
}
