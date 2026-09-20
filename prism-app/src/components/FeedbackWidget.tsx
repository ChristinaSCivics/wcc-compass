"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";

/** Floating feedback whisper — pilot phase: the circle is co-building this tool. */
/**
 * `anchored` pins the button just above its container instead of to the
 * viewport. On the conversation screen the composer owns the bottom of the
 * screen, and on a phone this button sat directly on top of Send — the one
 * control the whole screen exists for. Anchoring rather than nudging it up by
 * a fixed distance means it stays clear however tall the composer grows.
 */
export function FeedbackWidget({ anchored }: { anchored?: boolean } = {}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, page: pathname }),
    });
    if (res.ok) {
      setState("sent");
      setMessage("");
      setTimeout(() => {
        setOpen(false);
        setState("idle");
      }, 1800);
    } else {
      setState("idle");
    }
  }

  return (
    <div
      className={`z-30 flex flex-col items-end gap-2 ${
        anchored
          ? "absolute bottom-full right-5 mb-3"
          : "fixed bottom-5 right-5"
      }`}
    >
      {open && (
        <form
          onSubmit={submit}
          className="w-72 rounded-xl border border-borderline bg-surface-raised p-4 shadow-xl fade-up"
        >
          {state === "sent" ? (
            <p className="text-sm text-accent text-center py-4">
              Received — thank you for building this with us. ◈
            </p>
          ) : (
            <>
              <p className="text-xs text-muted mb-2">
                You&apos;re shaping this tool — what&apos;s working, what&apos;s not, what&apos;s missing?
              </p>
              <textarea
                autoFocus
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder="Tell us anything…"
                className="w-full bg-surface border border-borderline rounded-lg px-3 py-2 text-sm
                           focus:outline-none focus:border-accent transition-colors"
              />
              <button
                type="submit"
                disabled={state === "sending" || !message.trim()}
                className="mt-2 w-full border border-accent text-accent rounded-lg py-1.5 text-sm
                           hover:bg-accent hover:text-background transition-all disabled:opacity-40"
              >
                {state === "sending" ? "Sending…" : "Send"}
              </button>
            </>
          )}
        </form>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-full border border-accent bg-surface-raised px-6 py-3 text-sm text-accent
                   hover:bg-accent hover:text-background transition-all shadow-lg accent-glow"
      >
        {open ? "Close" : "✎ Feedback"}
      </button>
    </div>
  );
}
