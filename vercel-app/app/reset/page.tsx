"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function ResetPassword() {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setOk(null); setErr(null);
    if (pw.length < 8) { setErr("Password must be at least 8 characters."); return; }
    if (pw !== pw2) { setErr("Passwords do not match."); return; }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setLoading(false);

    if (error) { setErr(error.message); return; }
    setOk("Password updated. Redirecting to your alerts…");
    setTimeout(() => router.replace("/alerts"), 800);
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-3">
        <h1 className="text-xl font-semibold">Set a new password</h1>
        <input
          type="password"
          className="border p-2 w-full"
          placeholder="New password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          required
        />
        <input
          type="password"
          className="border p-2 w-full"
          placeholder="Confirm new password"
          value={pw2}
          onChange={(e) => setPw2(e.target.value)}
          required
        />
        <button
          disabled={loading}
          className="bg-black text-white px-3 py-2 rounded disabled:opacity-60"
        >
          {loading ? "Saving…" : "Save"}
        </button>
        {ok && <p className="text-green-600">{ok}</p>}
        {err && <p className="text-red-600">{err}</p>}
        <p className="text-sm text-zinc-500">
          Tip: this page expects you arrived via the password recovery email (you’ll already be signed in for this step).
        </p>
      </form>
    </main>
  );
}
