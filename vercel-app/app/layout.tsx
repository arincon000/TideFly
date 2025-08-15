export const metadata = { title: "TideFly", description: "Surf + flight alerts" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "ui-sans-serif, system-ui", margin: 0 }}>
        <div style={{ maxWidth: 900, margin: "24px auto", padding: "0 16px" }}>
          <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h1 style={{ fontSize: 20, margin: 0 }}>TideFly</h1>
            <nav style={{ display: "flex", gap: 12 }}>
              <a href="/alerts">Alerts</a>
              <a href="/alerts/new">New alert</a>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
