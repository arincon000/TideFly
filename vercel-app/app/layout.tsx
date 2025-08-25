import "./globals.css";
import Link from "next/link";
import SignOutButton from "@/components/SignOutButton";
import { Button } from "@/components/ui/button";

export const metadata = { title: "TideFly", description: "Surf + flight alerts" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">
        <div className="container mx-auto max-w-3xl p-4">
          <header className="mb-6 flex items-center justify-between">
            <h1 className="text-xl font-semibold">TideFly</h1>
            <nav className="flex items-center gap-3">
              <Button asChild variant="ghost">
                <Link href="/alerts">Alerts</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href="/alerts/new">New alert</Link>
              </Button>
              <SignOutButton />
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
