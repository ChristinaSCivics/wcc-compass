"use client";

import { useState } from "react";

/**
 * The ask, at the end rather than at the door.
 *
 * Email only, optional, with the reason stated next to the field. Someone who
 * has just spent five minutes and got something back is a warm ask; the same
 * person at the front door, before they know what this is, is not.
 */
export function MastermindSignup({
  when,
  compact,
}: {
  when: string | null;
  compact?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [optIn, setOptIn] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "sending") return;
    setState("sending");
    setError(null);
    try {
      const res = await fetch("/api/mastermind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, optIn }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "Something went wrong.");
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setState("idle");
    }
  }

  if (state === "done") {
    return (
      <div className="rounded-xl border border-teal/60 bg-surface-raised p-6">
        <p className="text-teal">You&apos;re on the list.</p>
        <p className="text-sm text-muted mt-1.5 leading-relaxed">
          {when
            ? `We'll see you on ${when}. You'll get the link by email.`
            : "We'll email you the date and the link as soon as they're set."}
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className={`rounded-xl border border-borderline bg-surface ${compact ? "p-4" : "p-6"}`}
    >
      <h2 className="text-teal text-lg">Come to the first mastermind</h2>
      <p className="text-sm text-muted leading-relaxed mt-1">
        {compact
          ? "A group call for everyone who's shared a vision. Leave your email and we'll send the link."
          : "A group call for everyone who's shared a vision. We open on what we found we share."}
        {when && <span className="text-foreground"> {when}.</span>}
      </p>

      <div className={`flex gap-2 ${compact ? "mt-3" : "mt-4 sm:gap-3"}`}>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className={`flex-1 min-w-0 bg-surface-raised border border-borderline rounded-xl
                      focus:outline-none focus:border-teal transition-colors
                      ${compact ? "px-3 py-2.5 text-sm" : "px-4 py-3"}`}
        />
        <button
          type="submit"
          disabled={state === "sending"}
          className={`shrink-0 border border-teal text-teal rounded-xl
                      hover:bg-teal hover:text-background transition-all disabled:opacity-40
                      ${compact ? "px-4 py-2.5 text-sm" : "px-6 py-3"}`}
        >
          {state === "sending" ? "Saving…" : "Invite me"}
        </button>
      </div>

      <label className={`flex items-start gap-3 cursor-pointer ${compact ? "mt-2.5" : "mt-4"}`}>
        <input
          type="checkbox"
          checked={optIn}
          onChange={(e) => setOptIn(e.target.checked)}
          className="w-4 h-4 mt-0.5 accent-teal shrink-0"
        />
        <span className="text-xs text-muted leading-relaxed">
          Also email me occasionally about what World Co-Creation is building.
        </span>
      </label>

      <p className={`text-xs text-muted/70 ${compact ? "mt-2" : "mt-4"}`}>
        We&apos;ll use it to send you the link, and the WCC team may follow up about getting involved.
      </p>

      {error && <p className="text-sm text-red-300 mt-3">{error}</p>}
    </form>
  );
}
