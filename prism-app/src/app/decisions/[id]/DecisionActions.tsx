"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DecisionActions({
  decisionId,
  decisionStatus,
  isFacilitator,
  hasConfirmedInput,
  activeConversationId,
  confirmedInputCount,
}: {
  decisionId: string;
  decisionStatus: string;
  isFacilitator: boolean;
  hasConfirmedInput: boolean;
  activeConversationId: string | null;
  confirmedInputCount: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function startInterview() {
    setBusy(true);
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "decision", decisionId }),
    });
    setBusy(false);
    if (res.ok) {
      const c = await res.json();
      router.push(`/chat/${c.id}`);
    }
  }

  async function runSynthesis() {
    setBusy(true);
    const res = await fetch("/api/synthesize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decisionId }),
    });
    setBusy(false);
    if (res.ok) router.refresh();
    else alert((await res.json()).error ?? "synthesis failed");
  }

  return (
    <div className="flex flex-wrap gap-3 mb-8">
      {!hasConfirmedInput && (
        activeConversationId ? (
          <button
            onClick={() => router.push(`/chat/${activeConversationId}`)}
            className="border border-gold text-gold rounded-full px-6 py-2
                       hover:bg-gold hover:text-background transition-all"
          >
            Continue my interview with Prism
          </button>
        ) : (
          <button
            onClick={startInterview}
            disabled={busy}
            className="border border-gold text-gold rounded-full px-6 py-2
                       hover:bg-gold hover:text-background transition-all disabled:opacity-40"
          >
            {busy ? "Opening…" : "Add my voice — interview with Prism"}
          </button>
        )
      )}
      {hasConfirmedInput && (
        <span className="text-sm text-muted self-center">✓ Your voice is in.</span>
      )}
      {isFacilitator && confirmedInputCount >= 2 && decisionStatus !== "decided" && (
        <button
          onClick={runSynthesis}
          disabled={busy}
          className="border border-borderline text-muted rounded-full px-6 py-2
                     hover:border-gold hover:text-gold transition-all disabled:opacity-40"
        >
          {busy ? "Prism is synthesizing…" : "Run Prism synthesis"}
        </button>
      )}
    </div>
  );
}
