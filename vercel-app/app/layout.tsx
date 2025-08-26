import "./globals.css";

export const metadata = {
  title: "TideFly",
  description: "Surf + flight alerts",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-slate-900 antialiased">{children}</body>
    </html>
  );
}
