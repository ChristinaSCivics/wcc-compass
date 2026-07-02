"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getKeeperPassword, clearKeeperPassword } from "@/lib/keeperClient";

export function NewDecisionForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const keeperPassword = getKeeperPassword();
    if (!keeperPassword) return;
    setBusy(true);
    const res = await fetch("/api/decisions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, keeperPassword }),
    });
    setBusy(false);
    if (res.status === 403) {
      clearKeeperPassword();
      alert("That keeper password wasn't right — try again.");
      return;
    }
    if (res.ok) {
      const d = await res.json();
      router.push(`/decisions/${d.id}`);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="border border-gold text-gold rounded-full px-6 py-2 text-sm
                   hover:bg-gold hover:text-background transition-all"
      >
        ⚿ Open a decision for the circle
      </button>
    );
  }

  return (
    <form onSubmit={create} className="rounded-xl border border-gold bg-surface-raised p-6 space-y-4 fade-up">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
        placeholder="What are we deciding? (e.g., What legal structure do we start with?)"
        className="w-full bg-surface border border-borderline rounded-lg px-4 py-3
                   focus:outline-none focus:border-gold"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        placeholder="Context the circle should know…"
        className="w-full bg-surface border border-borderline rounded-lg px-4 py-3
                   focus:outline-none focus:border-gold"
      />
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={busy}
          className="border border-gold text-gold rounded-lg px-6 py-2
                     hover:bg-gold hover:text-background transition-all disabled:opacity-40"
        >
          {busy ? "Opening…" : "Open decision"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-muted text-sm">
          Cancel
        </button>
      </div>
    </form>
  );
}
