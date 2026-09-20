"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { WccMark } from "@/components/WccLogo";
import { DemoBadge } from "@/components/DemoBadge";
import { isTestArmed, armTestMode, disarmTestMode, looksLikeTest } from "@/lib/testMode";

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
  const [testMode, setTestMode] = useState(false);

  // /login?test=1 opens a sandbox identity: it walks the whole product, but is
  // excluded from the collective weave, decision synthesis, and the member
  // counts. Arming it sticks to this browser — forgetting the query param once
  // is how test identities ended up counted as real voices. Read off window
  // rather than useSearchParams so this page doesn't need a Suspense boundary.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("test") === "1") armTestMode();
    setTestMode(isTestArmed());
  }, []);

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
      options: {
        data: { display_name: name.trim(), is_test: testMode || looksLikeTest(name) },
      },
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
      <WccMark size={48} />
      <h1 className="mt-6 text-3xl">Enter the Compass</h1>
      <div className="mt-3"><DemoBadge /></div>

      {testMode && (
        <div className="mt-5 w-full max-w-sm rounded-lg border border-amber/50 bg-amber/10 px-4 py-3 text-center fade-up">
          <p className="text-xs text-amber tracking-widest uppercase">Test mode is on</p>
          <p className="text-sm text-muted mt-1 leading-relaxed">
            Everything you do from this browser is sandboxed — left out of the weave,
            the decision synthesis and the member counts — until you turn it off.
          </p>
          <button
            onClick={() => { disarmTestMode(); setTestMode(false); }}
            className="mt-2 text-xs text-muted/70 underline hover:text-accent transition-colors"
          >
            Turn test mode off
          </button>
        </div>
      )}

      {/* in test mode always mint a fresh sandbox identity, never resume a real one */}
      {existingName && !showFresh && !testMode ? (
        <div className="mt-8 w-full max-w-sm flex flex-col gap-3 fade-up text-center">
          <p className="text-muted text-sm">Welcome back.</p>
          <button
            onClick={() => { router.push("/dashboard"); router.refresh(); }}
            className="border border-accent text-accent rounded-lg py-3
                       hover:bg-accent hover:text-background transition-all accent-glow"
          >
            Continue as {existingName} →
          </button>
          <button
            onClick={() => {
              // Anonymous identities live in this browser and nowhere else, so
              // starting fresh doesn't just switch user — it abandons the old
              // one permanently. Signing out already warns about this; starting
              // fresh has exactly the same consequence and used to say nothing.
              const sure = window.confirm(
                `Starting fresh creates a new person. Anything ${existingName} has said — conversations, a vision — stays with that identity, and this browser is the only place it can be reached from. Continue?`
              );
              if (sure) setShowFresh(true);
            }}
            className="text-xs text-muted/60 hover:text-accent transition-colors"
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
                     focus:outline-none focus:border-accent transition-colors"
        />
        <button
          type="submit"
          disabled={busy}
          className="border border-accent text-accent rounded-lg py-3
                     hover:bg-accent hover:text-background transition-all accent-glow disabled:opacity-40"
        >
          {busy ? "Opening the door…" : "Enter →"}
        </button>
        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
        {!testMode && looksLikeTest(name) && (
          <p className="text-xs text-amber text-center leading-relaxed">
            That name reads as a test, so this identity will be sandboxed — it won&apos;t
            join the collective map. Use a different name if you meant it for real.
          </p>
        )}
        <p className="text-xs text-muted mt-1 text-center">
          No account needed.{" "}
          <a href="/about#privacy" className="underline hover:text-accent transition-colors">
            How your words are kept
          </a>
        </p>
      </form>

      <button
        onClick={() => setShowReturning((s) => !s)}
        className="mt-10 text-xs text-muted/60 hover:text-accent transition-colors"
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
                       focus:outline-none focus:border-accent transition-colors"
          />
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="bg-surface border border-borderline rounded-lg px-4 py-3
                       focus:outline-none focus:border-accent transition-colors"
          />
          <button
            type="submit"
            disabled={busy}
            className="border border-borderline text-muted rounded-lg py-2 text-sm
                       hover:border-accent hover:text-accent transition-all disabled:opacity-40"
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
