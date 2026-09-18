"use client";

import { useState } from "react";
import { setKeeperPassword } from "@/lib/keeperClient";

/**
 * Asks for the keeper password in the page, rather than through a browser
 * prompt. A prompt can be suppressed by the browser, can't say what went
 * wrong, and offers no way to correct a typo — all of which look identical to
 * "the tool is broken".
 */
export function KeeperGate({
  error,
  onSubmit,
  busy,
}: {
  /** Message from the last attempt, if any. */
  error: string | null;
  onSubmit: () => void;
  busy?: boolean;
}) {
  const [value, setValue] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!value.trim()) return;
        setKeeperPassword(value.trim());
        onSubmit();
      }}
      className="rounded-xl border border-borderline bg-surface p-6 max-w-sm"
    >
      <span className="block text-[10px] text-teal tracking-[0.18em] uppercase mb-2">
        Keeper only
      </span>
      <p className="text-sm text-muted leading-relaxed mb-4">
        Shared with circle keepers. Whatever you do with it is recorded under your
        own name, not the password&apos;s.
      </p>
      <input
        type="password"
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Keeper password"
        className="w-full bg-surface-raised border border-borderline rounded-lg px-4 py-3
                   focus:outline-none focus:border-accent transition-colors"
      />
      <button
        type="submit"
        disabled={!value.trim() || busy}
        className="w-full mt-3 border border-accent text-accent rounded-lg py-2.5
                   hover:bg-accent hover:text-background transition-all disabled:opacity-40"
      >
        {busy ? "Checking…" : "Unlock"}
      </button>
      {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
    </form>
  );
}
