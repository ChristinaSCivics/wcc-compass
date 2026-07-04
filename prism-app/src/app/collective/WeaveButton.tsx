"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getKeeperPassword, clearKeeperPassword } from "@/lib/keeperClient";

export function WeaveButton({ hasVisions }: { hasVisions: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function weave() {
    const keeperPassword = getKeeperPassword();
    if (!keeperPassword) return;
    setBusy(true);
    const res = await fetch("/api/weave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keeperPassword }),
    });
    setBusy(false);
    if (res.status === 403) {
      clearKeeperPassword();
      alert("That keeper password wasn't right — try again.");
      return;
    }
    if (!res.ok) {
      alert((await res.json()).error ?? "weaving failed");
      return;
    }
    router.refresh();
  }

  if (!hasVisions) return null;

  return (
    <button
      onClick={weave}
      disabled={busy}
      title="Keeper action — requires the keeper password"
      className="border border-gold text-gold rounded-full px-5 py-2 text-sm
                 hover:bg-gold hover:text-background transition-all disabled:opacity-40"
    >
      {busy ? "Prism is weaving…" : "⚿ Ask Prism to weave the vision"}
    </button>
  );
}
