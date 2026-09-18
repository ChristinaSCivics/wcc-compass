"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { DraftEditor, type FieldGroup } from "@/components/DraftEditor";
import { TopNav } from "@/components/TopNav";
import { PrismPromise } from "@/components/PrismPromise";
import { YourPiece } from "@/components/YourPiece";

/**
 * The essentials stay open; everything else is one click away. A visitor who
 * gave Prism two minutes shouldn't meet sixteen textareas — but nothing is
 * removed, so anyone who went deep still finds all of it.
 */
const VISION_GROUPS: FieldGroup[] = [
  {
    title: "The essentials",
    keys: ["headline", "ideal_daily_life", "community"],
  },
  {
    title: "Your values, and your lines",
    hint: "What matters most, and what you could never live with",
    keys: ["core_values", "red_lines", "safety_and_freedom"],
  },
  {
    title: "Your piece of the puzzle",
    hint: "What you're great at, what you'd build, what you can give",
    keys: ["gifts", "blueprint", "capacity", "host_spark"],
  },
  {
    title: "More of your world",
    hint: "Home, work, health, learning — wherever the conversation reached",
    keys: [
      "home_and_environment",
      "work_and_contribution",
      "health_and_food",
      "learning_and_meaning",
      "keep_from_current_life",
    ],
  },
  {
    title: "Where the conversation didn't reach",
    hint: "Open ground — come back and fill it in any time",
    keys: ["open_questions"],
  },
];

export default function VisionReview() {
  const router = useRouter();
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null);
  const [newerDraft, setNewerDraft] = useState<Record<string, unknown> | null>(null);
  const [viewingDraft, setViewingDraft] = useState(false);
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
        .select("draft, confirmed, status, hidden, confirmed_at, updated_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setStatus(data.status);
        setHidden(!!data.hidden);
        setDraft((data.status === "confirmed" ? data.confirmed : data.draft) as Record<string, unknown>);
        // Kept talking after confirming? The newer draft is stored but must not
        // silently replace what they already stood behind — offer it instead.
        if (
          data.status === "confirmed" &&
          data.draft &&
          data.confirmed_at &&
          data.updated_at &&
          new Date(data.updated_at).getTime() > new Date(data.confirmed_at).getTime()
        ) {
          setNewerDraft(data.draft as Record<string, unknown>);
        }
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
    // A first confirmation ends in the closing, not a save — re-confirming an
    // existing vision goes back to where they were.
    if (res.ok) router.push(status === "confirmed" ? "/dashboard" : "/next");
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
      <p className="text-muted mb-4 leading-relaxed">
        Prism drafted this from your conversation — but a draft is not your voice.
        Correct anything, rewrite anything, delete anything. Only what you confirm
        becomes part of the collective map.
      </p>
      <p className="text-sm text-muted mb-6">
        Stopped early, or want to go deeper?{" "}
        <a href="/journey" className="text-accent underline">
          Keep talking with Prism
        </a>{" "}
        — your conversation is still open, and drafting again updates this page.
      </p>

      <div className="mb-10">
        <PrismPromise />
      </div>

      {!loading && newerDraft && !viewingDraft && (
        <div className="mb-8 rounded-xl border border-amber/50 bg-surface-raised p-5">
          <p className="text-sm leading-relaxed">
            You kept talking with Prism after confirming this. There&apos;s a newer draft
            waiting — your confirmed vision stays exactly as it is unless you choose to
            replace it.
          </p>
          <button
            onClick={() => { setViewingDraft(true); setDraft(newerDraft); }}
            className="mt-3 text-sm border border-amber text-amber rounded-full px-4 py-1.5
                       hover:bg-amber hover:text-background transition-all"
          >
            Review the newer draft →
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : draft ? (
        <>
          <DraftEditor
            key={viewingDraft ? "newer" : "current"}
            draft={draft}
            groups={VISION_GROUPS}
            onConfirm={confirm}
            confirming={confirming}
          />
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
                  className="w-5 h-5 accent-accent shrink-0"
                />
              </label>
            </div>
          )}
          {status === "confirmed" && (
            <div className="mt-6">
              <YourPiece vision={draft} />
            </div>
          )}
        </>
      ) : (
        <p className="text-muted">
          No draft yet — <Link href="/journey" className="text-accent">begin your conversation with Prism</Link>.
        </p>
      )}
    </main>
    </>
  );
}
