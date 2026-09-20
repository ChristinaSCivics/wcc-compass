"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { WccMark } from "@/components/WccLogo";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { ConversationProgress } from "@/components/ConversationProgress";

type Msg = { id?: string; role: "user" | "assistant"; content: string };

export function ChatClient({
  conversationId,
  kind,
  decisionId,
  initialMessages,
}: {
  conversationId: string;
  kind: "onboarding" | "decision";
  decisionId: string | null;
  initialMessages: Msg[];
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const autoDrafted = useRef(false);
  const opened = useRef(false);
  // Exchange count the banked background draft reflects, so Finish can skip a
  // second identical extraction when nothing has been said since.
  const draftedAt = useRef<number | null>(null);

  // Where most people finish. Also the point past which we quietly bank a draft.
  const TYPICAL = kind === "decision" ? 6 : 7;
  const exchanges = messages.filter((m) => m.role === "user").length;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Prism opens the conversation if it's brand new.
  // The ref guard matters: this effect is invoked twice under React's dev
  // StrictMode, and `busy` has not flushed by the second call, so the opener
  // was being sent twice — a visitor's first impression was Prism greeting
  // them twice over, with a stray "Hello" bubble of their own.
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    if (initialMessages.length === 0) void send("Hello");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A conversation that is never "finished" used to produce nothing at all —
  // one tester talked for 27 messages and no draft was ever written, because
  // drafting only happened on an explicit button press she never found. Once
  // there's clearly enough to work with, bank a draft in the background so the
  // work survives even if she closes the tab. Silent by design: it does not
  // navigate, and it never touches an already-confirmed vision.
  useEffect(() => {
    if (autoDrafted.current || busy || finishing) return;
    if (exchanges < TYPICAL) return;
    autoDrafted.current = true;
    const at = exchanges;
    void fetch("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId }),
    })
      .then((r) => {
        if (r.ok) draftedAt.current = at;
      })
      .catch(() => {
        // Best-effort only. The explicit Finish button remains the real path.
      });
  }, [exchanges, busy, finishing, conversationId, TYPICAL]);

  /** Put a notice in the trailing assistant bubble, or add one if there isn't a blank one. */
  function notice(text: string) {
    setMessages((m) => {
      const copy = [...m];
      const last = copy[copy.length - 1];
      if (last?.role === "assistant" && !last.content) {
        copy[copy.length - 1] = { ...last, content: text };
      } else {
        copy.push({ role: "assistant", content: text });
      }
      return copy;
    });
  }

  async function send(text: string) {
    if (busy || !text.trim()) return;
    setBusy(true);
    setError(null);
    const isOpener = messages.length === 0 && text === "Hello";
    if (!isOpener) setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");

    // Every exit path has to release the input. A mid-stream failure used to
    // escape this function with busy still true, which left the composer stuck
    // on "Prism is listening…" with no way back except a reload.
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, message: text }),
      });
      if (!res.ok || !res.body) throw new Error(`chat responded ${res.status}`);

      setMessages((m) => [...m, { role: "assistant", content: "" }]);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let received = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        received += chunk.length;
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = {
            ...copy[copy.length - 1],
            content: copy[copy.length - 1].content + chunk,
          };
          return copy;
        });
      }
      // a stream that closed without a single word is a failure, not a short answer
      if (received === 0) {
        notice("Prism went quiet there — say that again and it'll pick back up.");
      }
    } catch {
      notice("Something interrupted Prism — everything you've said is saved. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    if (finishing) return;
    setFinishing(true);
    setError(null);

    // A background draft already covers everything said so far — re-extracting
    // would burn another ten seconds to produce the same thing.
    if (draftedAt.current !== null && draftedAt.current === exchanges) {
      router.push(kind === "decision" ? `/decisions/${decisionId}/confirm` : "/vision");
      return;
    }

    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `draft responded ${res.status}`);
      }
      // stay disabled through the navigation — this conversation stays open,
      // so they can come back and keep going afterwards
      router.push(kind === "decision" ? `/decisions/${decisionId}/confirm` : "/vision");
    } catch (e) {
      setError(
        e instanceof Error
          ? `Prism couldn't draft that — ${e.message}`
          : "Prism couldn't draft that — please try again."
      );
      setFinishing(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col max-w-3xl mx-auto w-full">
      <header className="flex items-center justify-between px-6 py-4 border-b border-borderline sticky top-0 bg-background/90 backdrop-blur z-10">
        <Link
          href={kind === "decision" && decisionId ? `/decisions/${decisionId}` : "/dashboard"}
          className="flex items-center gap-3 group"
        >
          <WccMark />
          <span className="text-sm text-muted group-hover:text-accent transition-colors">
            ← {kind === "decision" ? "Back to the decision" : "Your vision — with Prism"}
          </span>
        </Link>
        {/* Available from the first exchange — a draft from a short conversation
            is thin, not wrong, and the door out should never be locked. */}
        {messages.length >= 2 && (
          <button
            onClick={finish}
            disabled={finishing || busy}
            className={`text-sm border border-accent rounded-full px-4 py-1.5 transition-all disabled:opacity-40 ${
              exchanges >= TYPICAL
                ? "bg-accent text-background hover:bg-accent-soft"
                : "text-accent hover:bg-accent hover:text-background"
            }`}
          >
            {finishing ? "Prism is drafting…" : "Finish & review draft"}
          </button>
        )}
      </header>

      {messages.length >= 2 && (
        <ConversationProgress
          exchanges={exchanges}
          typical={TYPICAL}
          onFinish={finish}
          disabled={finishing || busy}
        />
      )}

      {finishing && (
        <div
          className="fixed inset-0 z-40 bg-background/85 backdrop-blur-sm flex items-center justify-center px-6"
          role="status"
          aria-live="polite"
        >
          <div className="text-center max-w-sm">
            <div className="mx-auto w-fit animate-pulse">
              <WccMark size={44} />
            </div>
            <p className="mt-5 text-lg">Prism is writing up your vision…</p>
            <p className="mt-2 text-sm text-muted leading-relaxed">
              It&apos;s reading back everything you said, in your own words. This usually
              takes about ten seconds.
            </p>
            <div className="mt-5 h-1 w-full rounded-full bg-borderline overflow-hidden">
              <div className="h-full w-1/3 rounded-full bg-accent animate-[drift_1.4s_ease-in-out_infinite]" />
            </div>
          </div>
        </div>
      )}

      {error && (
        <p className="mx-6 mt-4 rounded-lg border border-red-400/40 bg-red-400/10 px-4 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="flex-1 px-6 py-8 space-y-6">
        {messages.map((m, i) => (
          <div key={m.id ?? i} className={`fade-up ${m.role === "user" ? "text-right" : ""}`}>
            <div
              className={`inline-block max-w-[85%] text-left rounded-2xl px-5 py-3 leading-relaxed whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-surface-raised border border-borderline"
                  : "text-foreground"
              }`}
            >
              {m.role === "assistant" && (
                <span className="block text-xs text-accent mb-1 tracking-widest uppercase">Prism</span>
              )}
              {m.content || <span className="text-muted">…</span>}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="sticky bottom-0 relative">
        <FeedbackWidget anchored />
        <form
          onSubmit={(e) => { e.preventDefault(); void send(input); }}
          className="bg-background/90 backdrop-blur border-t border-borderline p-4 flex flex-wrap gap-3"
        >
        {messages.length >= 2 && !finishing && (
          <p className="w-full text-xs text-muted text-center -mt-1">
            Stop whenever you like —{" "}
            <button type="button" onClick={finish} className="text-accent underline">
              finish and review your draft
            </button>
            . Nothing is lost, and you can always come back and go deeper.
          </p>
        )}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(input);
            }
          }}
          rows={2}
          placeholder={busy ? "Prism is listening…" : "Speak freely…"}
          className="flex-1 bg-surface border border-borderline rounded-xl px-4 py-3 resize-none
                     focus:outline-none focus:border-accent transition-colors"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="self-end border border-accent text-accent rounded-xl px-5 py-3
                     hover:bg-accent hover:text-background transition-all disabled:opacity-40"
        >
          Send
        </button>
        </form>
      </div>
    </main>
  );
}
