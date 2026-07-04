"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";

/** Floating feedback whisper — pilot phase: the circle is co-building this tool. */
export function FeedbackWidget() {
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
    <div className="fixed bottom-5 right-5 z-30 flex flex-col items-end gap-2">
      {open && (
        <form
          onSubmit={submit}
          className="w-72 rounded-xl border border-borderline bg-surface-raised p-4 shadow-xl fade-up"
        >
          {state === "sent" ? (
            <p className="text-sm text-gold text-center py-4">
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
                           focus:outline-none focus:border-gold transition-colors"
              />
              <button
                type="submit"
                disabled={state === "sending" || !message.trim()}
                className="mt-2 w-full border border-gold text-gold rounded-lg py-1.5 text-sm
                           hover:bg-gold hover:text-background transition-all disabled:opacity-40"
              >
                {state === "sending" ? "Sending…" : "Send"}
              </button>
            </>
          )}
        </form>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-full border border-borderline bg-surface-raised px-4 py-2 text-xs text-muted
                   hover:border-gold hover:text-gold transition-all shadow-lg"
      >
        {open ? "Close" : "✎ Feedback"}
      </button>
    </div>
  );
}
