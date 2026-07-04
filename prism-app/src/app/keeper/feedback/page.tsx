"use client";

import { useEffect, useState } from "react";
import { TopNav } from "@/components/TopNav";
import { getKeeperPassword, clearKeeperPassword } from "@/lib/keeperClient";

type Item = { id: string; message: string; page: string | null; created_at: string; name: string };

/** Keeper-only feedback review. Not linked in the nav — share the URL with keepers. */
export default function FeedbackReview() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const keeperPassword = getKeeperPassword();
      if (!keeperPassword) {
        setError("Keeper password required.");
        return;
      }
      const res = await fetch("/api/feedback/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keeperPassword }),
      });
      if (res.status === 403) {
        clearKeeperPassword();
        setError("That keeper password wasn't right — reload to try again.");
        return;
      }
      if (!res.ok) {
        setError("Couldn't load feedback.");
        return;
      }
      setItems((await res.json()).items);
    })();
  }, []);

  return (
    <>
    <TopNav />
    <main className="min-h-screen max-w-3xl mx-auto w-full px-6 py-10">
      <h1 className="text-4xl mb-3">Circle feedback</h1>
      <p className="text-muted mb-8 text-sm">
        Everything the circle has sent through the ✎ button, newest first. Keeper-only page.
      </p>

      {error && <p className="text-red-400 text-sm">{error}</p>}
      {!error && items === null && <p className="text-muted text-sm">Loading…</p>}
      {items?.length === 0 && <p className="text-muted text-sm">No feedback yet.</p>}

      <div className="space-y-4">
        {items?.map((f) => (
          <div key={f.id} className="rounded-xl border border-borderline bg-surface p-5">
            <p className="leading-relaxed whitespace-pre-wrap">{f.message}</p>
            <p className="text-xs text-muted mt-3">
              <span className="text-gold">{f.name}</span>
              {f.page && <> · on <span className="font-mono">{f.page}</span></>}
              {" · "}{new Date(f.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </main>
    </>
  );
}
