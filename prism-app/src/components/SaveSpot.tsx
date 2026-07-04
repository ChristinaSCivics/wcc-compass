"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Upgrade an anonymous identity to a returnable one (email + password).
 * Everything they've done — conversations, vision — carries over; same person,
 * now reachable from any device via "Have a password?" on the entry page.
 */
export function SaveSpot() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setState("busy");
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ email, password });
    if (error) {
      setError(error.message);
      setState("idle");
      return;
    }
    setState("done");
  }

  if (state === "done") {
    return (
      <div className="rounded-xl border border-gold bg-surface-raised p-6 gold-glow fade-up">
        <h2 className="text-xl mb-1">Your spot is saved ◈</h2>
        <p className="text-sm text-muted">
          You can now return from any device — entry page → &ldquo;Have a password?&rdquo; →{" "}
          <span className="text-gold">{email}</span>.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-borderline bg-surface p-6">
      {!open ? (
        <button onClick={() => setOpen(true)} className="text-left w-full group">
          <h2 className="text-xl mb-1 group-hover:text-gold transition-colors">
            Save my spot
          </h2>
          <p className="text-sm text-muted">
            Right now your conversations live only in this browser. Add an email &amp;
            password to return from anywhere — everything carries over.
          </p>
        </button>
      ) : (
        <form onSubmit={save} className="space-y-3 fade-up">
          <h2 className="text-xl">Save my spot</h2>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full bg-surface-raised border border-borderline rounded-lg px-4 py-3
                       focus:outline-none focus:border-gold transition-colors"
          />
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Choose a password (8+ characters)"
            className="w-full bg-surface-raised border border-borderline rounded-lg px-4 py-3
                       focus:outline-none focus:border-gold transition-colors"
          />
          <button
            type="submit"
            disabled={state === "busy"}
            className="w-full border border-gold text-gold rounded-lg py-2.5
                       hover:bg-gold hover:text-background transition-all disabled:opacity-40"
          >
            {state === "busy" ? "Saving…" : "Save my spot"}
          </button>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <p className="text-xs text-muted">
            Your email is only for signing back in — we send nothing to it.
          </p>
        </form>
      )}
    </div>
  );
}
