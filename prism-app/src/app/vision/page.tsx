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
  const [hidden, setHidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [togglingVisibility, setTogglingVisibility] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("vision_profiles")
        .select("draft, confirmed, status, hidden")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setStatus(data.status);
        setHidden(!!data.hidden);
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

  async function toggleVisibility() {
    const next = !hidden;
    setTogglingVisibility(true);
    const res = await fetch("/api/visibility", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "vision", hidden: next }),
    });
    setTogglingVisibility(false);
    if (res.ok) setHidden(next);
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
        <>
          <DraftEditor draft={draft} onConfirm={confirm} confirming={confirming} />
          {status === "confirmed" && (
            <div className="mt-6 rounded-xl border border-borderline bg-surface p-6">
              <label className="flex items-center justify-between gap-4 cursor-pointer">
                <span>
                  <span className="block">Visible to other confirmed members</span>
                  <span className="block text-sm text-muted mt-1">
                    Turn this off to hide your name and individual vision from other
                    members. Your vision always stays part of the collective weave —
                    just without your name attached to it.
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={!hidden}
                  disabled={togglingVisibility}
                  onChange={toggleVisibility}
                  className="w-5 h-5 accent-gold shrink-0"
                />
              </label>
            </div>
          )}
        </>
      ) : (
        <p className="text-muted">
          No draft yet — <Link href="/journey" className="text-gold">begin your conversation with Prism</Link>.
        </p>
      )}
    </main>
    </>
  );
}
