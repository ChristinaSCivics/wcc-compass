"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getKeeperPassword, clearKeeperPassword } from "@/lib/keeperClient";

export function DecisionActions({
  decisionId,
  decisionStatus,
  hasSynthesis,
  hasConfirmedInput,
  activeConversationId,
  confirmedInputCount,
}: {
  decisionId: string;
  decisionStatus: string;
  hasSynthesis: boolean;
  hasConfirmedInput: boolean;
  activeConversationId: string | null;
  confirmedInputCount: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [showRatify, setShowRatify] = useState(false);
  const [chosenOption, setChosenOption] = useState("");
  const [rationale, setRationale] = useState("");

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

  async function keeperPost(url: string, body: Record<string, unknown>) {
    const keeperPassword = getKeeperPassword();
    if (!keeperPassword) return null;
    setBusy(true);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, keeperPassword }),
    });
    setBusy(false);
    if (res.status === 403) {
      clearKeeperPassword();
      alert("That keeper password wasn't right — try again.");
      return null;
    }
    if (!res.ok) {
      alert((await res.json()).error ?? "something went wrong");
      return null;
    }
    return res;
  }

  async function runSynthesis() {
    const res = await keeperPost("/api/synthesize", { decisionId });
    if (res) router.refresh();
  }

  async function ratify(e: React.FormEvent) {
    e.preventDefault();
    const res = await keeperPost("/api/decide", { decisionId, chosenOption, rationale });
    if (res) {
      setShowRatify(false);
      router.refresh();
    }
  }

  return (
    <div className="mb-8">
      <div className="flex flex-wrap gap-3">
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

        {confirmedInputCount >= 2 && decisionStatus !== "decided" && (
          <button
            onClick={runSynthesis}
            disabled={busy}
            title="Keeper action — requires the keeper password"
            className="border border-borderline text-muted rounded-full px-6 py-2
                       hover:border-gold hover:text-gold transition-all disabled:opacity-40"
          >
            {busy ? "Prism is synthesizing…" : "⚿ Run Prism synthesis"}
          </button>
        )}

        {hasSynthesis && decisionStatus !== "decided" && (
          <button
            onClick={() => setShowRatify((s) => !s)}
            title="Keeper action — requires the keeper password"
            className="border border-borderline text-muted rounded-full px-6 py-2
                       hover:border-gold hover:text-gold transition-all"
          >
            ⚿ Record the group&apos;s decision
          </button>
        )}
      </div>

      {showRatify && (
        <form
          onSubmit={ratify}
          className="mt-4 rounded-xl border border-gold bg-surface-raised p-6 space-y-3 fade-up"
        >
          <p className="text-sm text-muted">
            Record what the group ratified together. This enters the permanent record
            under your name.
          </p>
          <input
            value={chosenOption}
            onChange={(e) => setChosenOption(e.target.value)}
            required
            placeholder="The option the group chose"
            className="w-full bg-surface border border-borderline rounded-lg px-4 py-3
                       focus:outline-none focus:border-gold"
          />
          <textarea
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            required
            rows={3}
            placeholder="Why — the group's reasoning, including any dissent honored…"
            className="w-full bg-surface border border-borderline rounded-lg px-4 py-3
                       focus:outline-none focus:border-gold"
          />
          <button
            type="submit"
            disabled={busy}
            className="border border-gold text-gold rounded-lg px-6 py-2
                       hover:bg-gold hover:text-background transition-all disabled:opacity-40"
          >
            {busy ? "Recording…" : "Record it"}
          </button>
        </form>
      )}
    </div>
  );
}
