"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** One press to ask for the newsletter, from the account page. */
export function UpdatesOptIn() {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");

  async function optIn() {
    setState("busy");
    const res = await fetch("/api/audience", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ optIn: true }),
    }).catch(() => null);
    if (!res?.ok) return setState("error");
    router.refresh();
  }

  return (
    <button
      onClick={() => void optIn()}
      disabled={state === "busy"}
      className="shrink-0 text-xs text-accent hover:underline mt-0.5 disabled:opacity-40"
    >
      {state === "busy" ? "Adding…" : state === "error" ? "Didn't work — try again" : "Yes, email me →"}
    </button>
  );
}
