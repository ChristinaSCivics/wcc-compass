"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Upgrade an anonymous identity to a returnable one (email + password).
 * Everything they've done — conversations, vision — carries over; same person,
 * now reachable from any device via the sign-in link on the entry page.
 *
 * It leads with the mastermind now. "Save my spot" asks someone to protect
 * work they haven't done yet, which is a weak reason to type an address, and
 * the call — the actual invitation — was buried behind a click and then a
 * tickbox. The invitation is the headline; keeping their spot is what the same
 * address also buys them. The form is open from the start, because a card that
 * has to be opened before it says anything is a card most people never read.
 *
 * The call is ticked by default since it's what the card is headed with and
 * the button says so; the mailing list is a different promise and stays opt-in
 * elsewhere. Untick it and the copy stops promising an email.
 */
export function SaveSpot({ when }: { when?: string | null }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [wantsCall, setWantsCall] = useState(true);
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
          <span className="text-accent">{email}</span>.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-teal/50 bg-surface p-6">
      <form onSubmit={save} className="space-y-3">
          <span className="block text-[10px] text-teal tracking-[0.18em] uppercase">
            Come to the first mastermind
          </span>
          <h2 className="text-xl">A group call for everyone who&rsquo;s been through it</h2>
          <p className="text-sm text-muted leading-relaxed">
            Leave an email and we&rsquo;ll send you the link.
            {when && <span className="text-foreground"> {when}.</span>} It keeps your
            spot too — right now your conversation lives only in this browser, and an
            email and password let you pick it up from any device.
          </p>
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
              Invite me to the first mastermind. Untick this and your email only
              signs you back in.
            </span>
          </label>
          <button
            type="submit"
            disabled={state === "busy"}
            className="w-full border border-teal text-teal rounded-lg py-2.5
                       hover:bg-teal hover:text-background transition-all disabled:opacity-40"
          >
            {state === "busy"
              ? "Saving…"
              : wantsCall
                ? "Invite me & save my spot"
                : "Save my spot"}
          </button>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <p className="text-xs text-muted">
            {wantsCall
              ? "Your email is for signing back in, and for the mastermind link. Nothing else."
              : "Your email is only for signing back in — we send nothing to it."}
        </p>
      </form>
    </div>
  );
}
