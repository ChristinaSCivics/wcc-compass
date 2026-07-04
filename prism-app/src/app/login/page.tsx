"use client";

import { useEffect, useState } from "react";
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
  const [existingName, setExistingName] = useState<string | null>(null);
  const [showFresh, setShowFresh] = useState(false);

  // if this browser already holds an identity, offer to continue as them —
  // typing your name again should never silently create a second you
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles").select("display_name").eq("id", user.id).single();
        setExistingName(profile?.display_name ?? "friend");
      }
    })();
  }, []);

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
    // disclosed below: coarse entry context (region, timezone, device)
    void fetch("/api/context", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
    });
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

      {existingName && !showFresh ? (
        <div className="mt-8 w-full max-w-sm flex flex-col gap-3 fade-up text-center">
          <p className="text-muted text-sm">Welcome back.</p>
          <button
            onClick={() => { router.push("/dashboard"); router.refresh(); }}
            className="border border-gold text-gold rounded-lg py-3
                       hover:bg-gold hover:text-background transition-all gold-glow"
          >
            Continue as {existingName} →
          </button>
          <button
            onClick={() => setShowFresh(true)}
            className="text-xs text-muted/60 hover:text-gold transition-colors"
          >
            Not you? Start fresh instead
          </button>
        </div>
      ) : (
      <>
      <p className="mt-3 text-muted text-sm max-w-sm text-center leading-relaxed">
        What should we call you?
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
        <p className="text-xs text-muted mt-1 text-center">
          No account needed.{" "}
          <a href="/about#privacy" className="underline hover:text-gold transition-colors">
            How your words are kept
          </a>
        </p>
      </form>

      <button
        onClick={() => setShowReturning((s) => !s)}
        className="mt-10 text-xs text-muted/60 hover:text-gold transition-colors"
      >
        {showReturning ? "Hide" : "Have a password?"}
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
      </>
      )}
    </main>
  );
}
