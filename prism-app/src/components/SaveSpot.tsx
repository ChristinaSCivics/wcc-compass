"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { GoogleButton } from "@/components/GoogleButton";

/**
 * Upgrade an anonymous identity to a returnable one (email + password).
 * Everything they've done — conversations, vision — carries over; same person,
 * now reachable from any device via the sign-in link on the entry page.
 *
 * Secondary on purpose. Inventing a password is the heaviest thing the site
 * asks of anyone and two people have ever done it, so it is no longer in the
 * way of the invitation — the mastermind asks for one field and this sits
 * below, folded, for the person who actually wants to come back on their
 * laptop. The call tickbox stays, since someone who opens this may not have
 * been asked yet.
 */
export function SaveSpot({ when }: { when?: string | null }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [wantsCall, setWantsCall] = useState(false);
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

    // Mirror it onto the profile. Auth is the source of truth and the admin
    // views read it there, but the profile row is what the rest of the app
    // joins against, and leaving it blank made the Emails page report that
    // nobody had saved a spot while two people had.
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles")
        .update({ email: email.trim().toLowerCase() })
        .eq("id", user.id);
    }

    // Best effort, and deliberately after the account is safe: failing to add
    // someone to a call list must never cost them the thing they came here to
    // do, which is not lose their work.
    await fetch("/api/audience", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }).catch(() => {});
    if (wantsCall) {
      await fetch("/api/mastermind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, optIn: false }),
      }).catch(() => {});
    }

    setState("done");
  }

  if (state === "done") {
    return (
      <div className="rounded-xl border border-teal/60 bg-surface-raised p-6 fade-up">
        <h2 className="text-xl mb-1">
          {wantsCall ? "You're on the list ◈" : "Your spot is saved ◈"}
        </h2>
        {wantsCall && (
          <p className="text-sm text-muted">
            {when
              ? `We'll see you on ${when} — the link comes by email.`
              : "We'll email you the date and the link as soon as they're set."}
          </p>
        )}
        <p className="text-sm text-muted mt-2">
          Your spot is kept, so you can return from any device — at the entry page
          choose &ldquo;Saved a spot here before? Sign in&rdquo; and use{" "}
          <span className="text-accent">{email}</span>.{" "}
          <a href="/account" className="text-accent underline underline-offset-4">See your spot</a>
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-borderline bg-surface/60 px-4 py-3">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="text-left w-full text-sm text-muted hover:text-accent transition-colors"
        >
          Using another device later? Save your spot to pick this up there →
        </button>
      ) : (
        <form onSubmit={save} className="space-y-3 fade-up">
          <h2 className="text-sm">Save your spot</h2>
          <p className="text-xs text-muted leading-relaxed">
            Your conversation lives in this browser only. Google, or an email and
            password, let you sign back in anywhere.
          </p>
          <GoogleButton mode="link" next="/account" />
          <p className="text-xs text-muted/60 text-center">or with a password</p>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full bg-surface-raised border border-borderline rounded-lg px-4 py-3
                       focus:outline-none focus:border-accent transition-colors"
          />
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Choose a password (8+ characters)"
            className="w-full bg-surface-raised border border-borderline rounded-lg px-4 py-3
                       focus:outline-none focus:border-accent transition-colors"
          />
          <label className="flex items-start gap-3 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={wantsCall}
              onChange={(e) => setWantsCall(e.target.checked)}
              className="w-4 h-4 mt-0.5 accent-teal shrink-0"
            />
            <span className="text-sm text-muted leading-relaxed">
              Also invite me to the first mastermind{when ? ` — ${when}` : ""}.
            </span>
          </label>
          <button
            type="submit"
            disabled={state === "busy"}
            className="w-full border border-accent text-accent rounded-lg py-2.5 text-sm
                       hover:bg-accent hover:text-background transition-all disabled:opacity-40"
          >
            {state === "busy" ? "Saving…" : "Save my spot"}
          </button>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <p className="text-xs text-muted">
            {wantsCall
              ? "Your email is for signing back in and the mastermind link, and you may be added to our contact list (Fibery) so the WCC team can reach out about getting involved. Never sold, never spam."
              : "Your email is for signing back in, and you may be added to our contact list (Fibery) so the WCC team can reach out about getting involved. Never sold, never spam."}
          </p>
        </form>
      )}
    </div>
  );
}
