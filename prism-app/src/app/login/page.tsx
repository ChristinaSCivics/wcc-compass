"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PrismMark } from "@/components/PrismMark";

export default function Login() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center horizon px-6">
      <PrismMark size={48} />
      <h1 className="mt-6 text-3xl">Enter the Compass</h1>
      {sent ? (
        <p className="mt-6 text-muted text-center max-w-sm fade-up">
          A sign-in link is on its way to <span className="text-gold">{email}</span>.
          Open it on this device.
        </p>
      ) : (
        <form onSubmit={sendLink} className="mt-8 w-full max-w-sm flex flex-col gap-3 fade-up">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="bg-surface border border-borderline rounded-lg px-4 py-3
                       focus:outline-none focus:border-gold transition-colors"
          />
          <button
            type="submit"
            className="border border-gold text-gold rounded-lg py-3
                       hover:bg-gold hover:text-background transition-all"
          >
            Send me a sign-in link
          </button>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <p className="text-xs text-muted mt-2">
            No password — a magic link arrives by email.
          </p>
        </form>
      )}
    </main>
  );
}
