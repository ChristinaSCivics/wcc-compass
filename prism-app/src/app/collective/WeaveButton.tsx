"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { getKeeperPassword, clearKeeperPassword, isKnownKeeper } from "@/lib/keeperClient";

/**
 * Weave now, for a keeper who doesn't want to wait for the automatic one.
 *
 * It used to be a bordered button in the first card on the page, which put a
 * piece of machinery in the spot where a visitor should be meeting the map.
 * PRiSM re-weaves on its own now, so this is a quiet link at the foot of the
 * page — and only on browsers the server has already accepted as a keeper's,
 * read through useSyncExternalStore so the server snapshot of `false` keeps
 * hydration consistent.
 */
export function WeaveButton({ hasVisions }: { hasVisions: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const keeper = useSyncExternalStore(
    () => () => {},
    () => isKnownKeeper(),
    () => false
  );

  async function weave() {
    const keeperPassword = getKeeperPassword();
    if (!keeperPassword) {
      // Marked as a keeper's browser, but the password hasn't been entered
      // this session — send them to the door rather than failing silently.
      router.push("/admin");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/weave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keeperPassword }),
    });
    setBusy(false);
    if (res.status === 403) {
      clearKeeperPassword();
      router.push("/admin");
      return;
    }
    if (!res.ok) {
      alert((await res.json()).error ?? "weaving failed");
      return;
    }
    router.refresh();
  }

  if (!hasVisions || !keeper) return null;

  return (
    <button
      onClick={weave}
      disabled={busy}
      className="text-xs text-amber underline underline-offset-4
                 hover:text-accent transition-colors disabled:opacity-40"
    >
      {busy ? "PRiSM is weaving…" : "Weave now"}
    </button>
  );
}
