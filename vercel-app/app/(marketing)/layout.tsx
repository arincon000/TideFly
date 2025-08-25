export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="px-6 py-4 flex items-center justify-between border-b">
          <div className="font-bold">TideFly</div>
          <nav className="flex gap-4">
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="/signin">Sign in</a>
            <a href="/signin" className="px-3 py-1 rounded bg-blue-600 text-white">Get started</a>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
