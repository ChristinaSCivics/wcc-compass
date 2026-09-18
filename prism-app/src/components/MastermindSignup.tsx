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
    <form onSubmit={submit} className="rounded-xl border border-borderline bg-surface p-6">
      <span className="block text-[10px] text-teal tracking-[0.18em] uppercase mb-2">
        Come to the first mastermind
      </span>
      <p className="text-sm text-muted leading-relaxed">
        {compact
          ? "A group call for everyone who's been through the Compass. Leave an email and we'll send you the link."
          : "A group call for everyone who's been through the Compass. We open on what we found we share, and go from there."}
        {when && <span className="text-foreground"> {when}.</span>}
      </p>

      <div className="mt-4 flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="flex-1 bg-surface-raised border border-borderline rounded-xl px-4 py-3
                     focus:outline-none focus:border-teal transition-colors"
        />
        <button
          type="submit"
          disabled={state === "sending"}
          className="shrink-0 border border-teal text-teal rounded-xl px-6 py-3
                     hover:bg-teal hover:text-background transition-all disabled:opacity-40"
        >
          {state === "sending" ? "Saving…" : "Invite me"}
        </button>
      </div>

      <label className="flex items-start gap-3 mt-4 cursor-pointer">
        <input
          type="checkbox"
          checked={optIn}
          onChange={(e) => setOptIn(e.target.checked)}
          className="w-4 h-4 mt-0.5 accent-teal shrink-0"
        />
        <span className="text-xs text-muted leading-relaxed">
          Also email me occasionally about what World Co-Creation is building. Separate
          from the call — you can come to the mastermind without this.
        </span>
      </label>

      <p className="text-xs text-muted/70 mt-4 leading-relaxed">
        Your email is used to send you the call link, and nothing else. We don&apos;t ask
        for your phone number.
      </p>

      {error && <p className="text-sm text-red-300 mt-3">{error}</p>}
    </form>
  );
}
