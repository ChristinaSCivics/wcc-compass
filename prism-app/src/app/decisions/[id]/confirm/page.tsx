"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { DraftEditor } from "@/components/DraftEditor";
import { PrismMark } from "@/components/PrismMark";

export default function ConfirmDecisionInput({ params }: { params: Promise<{ id: string }> }) {
  const { id: decisionId } = use(params);
  const router = useRouter();
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("decision_inputs")
        .select("needs")
        .eq("decision_id", decisionId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) setDraft(data.needs as Record<string, unknown>);
      setLoading(false);
    })();
  }, [decisionId]);

  async function confirm(edited: Record<string, unknown>) {
    setConfirming(true);
    const res = await fetch("/api/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "decision_input", content: edited, decisionId }),
    });
    setConfirming(false);
    if (res.ok) router.push(`/decisions/${decisionId}`);
  }

  return (
    <main className="min-h-screen max-w-2xl mx-auto w-full px-6 py-8">
      <header className="flex items-center gap-3 mb-10">
        <Link href={`/decisions/${decisionId}`}><PrismMark /></Link>
        <span className="text-sm text-muted">Your input — review &amp; confirm</span>
      </header>

      <h1 className="text-3xl mb-3">Did Prism hear you right?</h1>
      <p className="text-muted mb-10 leading-relaxed">
        This is what enters the synthesis as <em>your</em> voice. Edit until it&apos;s true.
      </p>

      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : draft ? (
        <DraftEditor draft={draft} onConfirm={confirm} confirming={confirming} />
      ) : (
        <p className="text-muted">No draft found — finish your interview first.</p>
      )}
    </main>
  );
}
