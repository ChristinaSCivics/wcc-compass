"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Keeps the collective map from going quietly stale.
 *
 * When someone opens the collective page and voices have joined since the last
 * weaving, this asks the server for a fresh one. The server decides whether to
 * actually do it — it refuses if nothing is new, or if it wove recently — so
 * this can't turn a busy day into a weave per visitor.
 *
 * Silent either way: a visitor shouldn't see machinery, and the keeper's
 * "weave now" button still exists for when you want it immediately.
 */
export function AutoWeave({ stale }: { stale: boolean }) {
  const router = useRouter();
  const asked = useRef(false);

  useEffect(() => {
    if (!stale || asked.current) return;
    asked.current = true;
    void fetch("/api/weave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auto: true }),
    })
      .then(async (r) => {
        if (!r.ok) return;
        const body = await r.json().catch(() => null);
        // Only reload when a new weaving actually landed.
        if (body?.ok && !body?.skipped) router.refresh();
      })
      .catch(() => {
        // Best effort. The page still shows the previous weaving.
      });
  }, [stale, router]);

  return null;
}
