"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PrismMark } from "@/components/PrismMark";

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
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Prism opens the conversation if it's brand new
  useEffect(() => {
    if (initialMessages.length === 0) void send("Hello");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function send(text: string) {
    if (busy || !text.trim()) return;
    setBusy(true);
    const isOpener = messages.length === 0 && text === "Hello";
    if (!isOpener) setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, message: text }),
    });
    if (!res.ok || !res.body) {
      setMessages((m) => [...m, { role: "assistant", content: "Something went wrong — please try again." }]);
      setBusy(false);
      return;
    }

    setMessages((m) => [...m, { role: "assistant", content: "" }]);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = {
          ...copy[copy.length - 1],
          content: copy[copy.length - 1].content + chunk,
        };
        return copy;
      });
    }
    setBusy(false);
  }

  async function finish() {
    setFinishing(true);
    const res = await fetch("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId }),
    });
    setFinishing(false);
    if (res.ok) {
      router.push(kind === "decision" ? `/decisions/${decisionId}/confirm` : "/vision");
    }
  }

  return (
    <main className="min-h-screen flex flex-col max-w-3xl mx-auto w-full">
      <header className="flex items-center justify-between px-6 py-4 border-b border-borderline sticky top-0 bg-background/90 backdrop-blur z-10">
        <Link href="/dashboard" className="flex items-center gap-3">
          <PrismMark />
          <span className="text-sm text-muted">
            {kind === "decision" ? "Decision interview" : "Your vision — with Prism"}
          </span>
        </Link>
        {messages.length >= 6 && (
          <button
            onClick={finish}
            disabled={finishing || busy}
            className="text-sm border border-gold text-gold rounded-full px-4 py-1.5
                       hover:bg-gold hover:text-background transition-all disabled:opacity-40"
          >
            {finishing ? "Prism is drafting…" : "Finish & review draft"}
          </button>
        )}
      </header>

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
                <span className="block text-xs text-gold mb-1 tracking-widest uppercase">Prism</span>
              )}
              {m.content || <span className="text-muted">…</span>}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); void send(input); }}
        className="sticky bottom-0 bg-background/90 backdrop-blur border-t border-borderline p-4 flex gap-3"
      >
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
                     focus:outline-none focus:border-gold transition-colors"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="self-end border border-gold text-gold rounded-xl px-5 py-3
                     hover:bg-gold hover:text-background transition-all disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </main>
  );
}
