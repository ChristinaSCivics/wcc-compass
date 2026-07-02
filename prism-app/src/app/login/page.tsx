"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PrismMark } from "@/components/PrismMark";

/**
 * Lightweight entry for the pilot: give us a name, and you're in.
 * An anonymous identity is created behind the scenes so your conversations
 * and vision belong to you; it can be upgraded to a full account later.
 */
export default function Enter() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReturning, setShowReturning] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function enter(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInAnonymously({
      options: { data: { display_name: name.trim() } },
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center horizon px-6">
      <PrismMark size={48} />
      <h1 className="mt-6 text-3xl">Enter the Compass</h1>
      <p className="mt-3 text-muted text-sm max-w-sm text-center leading-relaxed">
        No account, no password — just tell us what to call you.
      </p>

      <form onSubmit={enter} className="mt-8 w-full max-w-sm flex flex-col gap-3 fade-up">
        <input
          type="text"
          required
          minLength={2}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name or handle"
          className="bg-surface border border-borderline rounded-lg px-4 py-3 text-center
                     focus:outline-none focus:border-gold transition-colors"
        />
        <button
          type="submit"
          disabled={busy}
          className="border border-gold text-gold rounded-lg py-3
                     hover:bg-gold hover:text-background transition-all gold-glow disabled:opacity-40"
        >
          {busy ? "Opening the door…" : "Enter →"}
        </button>
        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
        <p className="text-xs text-muted mt-1 text-center leading-relaxed">
          Your conversations stay yours, tied to this browser for now.
          Full accounts come later.
        </p>
      </form>

      <button
        onClick={() => setShowReturning((s) => !s)}
        className="mt-10 text-xs text-muted hover:text-gold transition-colors"
      >
        {showReturning ? "Hide" : "Returning with a password?"}
      </button>
      {showReturning && (
        <form onSubmit={signIn} className="mt-4 w-full max-w-sm flex flex-col gap-3 fade-up">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="bg-surface border border-borderline rounded-lg px-4 py-3
                       focus:outline-none focus:border-gold transition-colors"
          />
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="bg-surface border border-borderline rounded-lg px-4 py-3
                       focus:outline-none focus:border-gold transition-colors"
          />
          <button
            type="submit"
            disabled={busy}
            className="border border-borderline text-muted rounded-lg py-2 text-sm
                       hover:border-gold hover:text-gold transition-all disabled:opacity-40"
          >
            Sign in
          </button>
        </form>
      )}
    </main>
  );
}
