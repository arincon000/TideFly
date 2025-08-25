import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/signin");

  return (
    <html lang="en">
      <body>
        <header className="px-6 py-4 flex items-center justify-between border-b">
          <div className="font-bold">TideFly</div>
          <nav className="flex gap-3">
            <a href="/alerts">Dashboard</a>
            <form action="/api/signout" method="post">
              <button className="px-3 py-1 border rounded">Sign out</button>
            </form>
          </nav>
        </header>
        <main className="p-6">{children}</main>
      </body>
    </html>
  );
}
