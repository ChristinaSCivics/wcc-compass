"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { DraftEditor } from "@/components/DraftEditor";
import { TopNav } from "@/components/TopNav";

export default function VisionReview() {
  const router = useRouter();
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("vision_profiles")
        .select("draft, confirmed, status")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setStatus(data.status);
        setDraft((data.status === "confirmed" ? data.confirmed : data.draft) as Record<string, unknown>);
      }
      setLoading(false);
    })();
  }, []);

  async function confirm(edited: Record<string, unknown>) {
    setConfirming(true);
    const res = await fetch("/api/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "vision", content: edited }),
    });
    setConfirming(false);
    if (res.ok) router.push("/dashboard");
  }

  return (
    <>
    <TopNav />
    <main className="min-h-screen max-w-2xl mx-auto w-full px-6 py-10">
      <h1 className="text-3xl mb-3">
        {status === "confirmed" ? "Your confirmed vision" : "Is this true to you?"}
      </h1>
      <p className="text-muted mb-10 leading-relaxed">
        Prism drafted this from your conversation — but a draft is not your voice.
        Correct anything, rewrite anything, delete anything. Only what you confirm
        becomes part of the collective map.
      </p>

      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : draft ? (
        <DraftEditor draft={draft} onConfirm={confirm} confirming={confirming} />
      ) : (
        <p className="text-muted">
          No draft yet — <Link href="/journey" className="text-gold">begin your conversation with Prism</Link>.
        </p>
      )}
    </main>
    </>
  );
}
