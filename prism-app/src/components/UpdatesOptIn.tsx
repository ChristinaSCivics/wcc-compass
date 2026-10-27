"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** The newsletter box on the You page: tick to get updates, untick to stop. */
export function UpdatesOptIn({ on }: { on: boolean }) {
  const router = useRouter();
  const [checked, setChecked] = useState(on);
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");

  async function change(next: boolean) {
    setChecked(next);
    setState("busy");
    const res = await fetch("/api/audience", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ optIn: next, toggle: true }),
    }).catch(() => null);
    if (!res?.ok) {
      setChecked(!next);
      return setState("error");
    }
    setState("idle");
    router.refresh();
  }

  return (
    <label className="mt-2 flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        disabled={state === "busy"}
        onChange={(e) => void change(e.target.checked)}
        className="w-4 h-4 mt-0.5 accent-teal shrink-0"
      />
      <span className="text-sm leading-relaxed">
        Email me occasionally about what World Co-Creation is building
        {state === "busy" && <span className="text-muted"> — saving…</span>}
        {state === "error" && <span className="text-red-400"> — didn&rsquo;t save, try again</span>}
      </span>
    </label>
  );
}
