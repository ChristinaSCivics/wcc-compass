"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

async function post(body: Record<string, unknown>) {
  const res = await fetch("/api/account", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => null);
  if (!res) throw new Error("Couldn't reach the server.");
  const out = await res.json().catch(() => null);
  if (!res.ok) throw new Error(out?.error ?? "That didn't save.");
}

/** Your name, edited where it's shown. */
export function NameEditor({ name }: { name: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await post({ action: "name", name: value });
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    }
    setBusy(false);
  }

  if (!editing) {
    return (
      <div className="flex items-baseline gap-3 flex-wrap">
        <h1 className="text-3xl sm:text-4xl">{name}</h1>
        <button onClick={() => setEditing(true)} className="text-xs text-muted hover:text-accent transition-colors">
          Change name
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={save} className="flex gap-2 flex-wrap items-center">
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        minLength={2}
        maxLength={60}
        className="flex-1 min-w-0 bg-surface border border-borderline rounded-lg px-4 py-2.5 text-xl
                   focus:outline-none focus:border-accent transition-colors"
      />
      <button
        type="submit"
        disabled={busy}
        className="border border-accent text-accent rounded-lg px-4 py-2.5 text-sm
                   hover:bg-accent hover:text-background transition-all disabled:opacity-40"
      >
        {busy ? "Saving…" : "Save"}
      </button>
      <button
        type="button"
        onClick={() => { setEditing(false); setValue(name); }}
        className="text-sm text-muted hover:text-accent"
      >
        Cancel
      </button>
      {error && <p className="w-full text-sm text-red-400">{error}</p>}
    </form>
  );
}

/** A tickbox that flips one of the You page's switches. */
export function AccountToggle({
  action,
  on,
  label,
}: {
  action: "call" | "contact";
  on: boolean;
  label: string;
}) {
  const router = useRouter();
  const [checked, setChecked] = useState(on);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function change(next: boolean) {
    setChecked(next);
    setBusy(true);
    setError(null);
    try {
      await post({ action, on: next });
      router.refresh();
    } catch (err) {
      setChecked(!next);
      setError((err as Error).message);
    }
    setBusy(false);
  }

  return (
    <label className="mt-2 flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        disabled={busy}
        onChange={(e) => void change(e.target.checked)}
        className="w-4 h-4 mt-0.5 accent-teal shrink-0"
      />
      <span className="text-sm leading-relaxed">
        {label}
        {busy && <span className="text-muted"> — saving…</span>}
        {error && <span className="text-red-400"> — {error}</span>}
      </span>
    </label>
  );
}

/** Add or change a password, so Google isn't the only way back in. */
export function PasswordSetter({ hasPassword }: { hasPassword: boolean }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    setError(null);
    const { error } = await createClient().auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setState("idle");
      return;
    }
    setPassword("");
    setState("done");
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); setState("idle"); }}
        className="text-sm text-muted hover:text-accent transition-colors"
      >
        {state === "done"
          ? "Password saved ✓"
          : hasPassword ? "Change your password" : "Add a password too"}
      </button>
    );
  }

  return (
    <form onSubmit={save} className="flex gap-2 flex-wrap max-w-md">
      <input
        type="password"
        required
        minLength={8}
        autoFocus
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="New password (8+ characters)"
        className="flex-1 min-w-0 bg-surface-raised border border-borderline rounded-lg px-4 py-2.5 text-sm
                   focus:outline-none focus:border-accent transition-colors"
      />
      <button
        type="submit"
        disabled={state === "busy"}
        className="border border-accent text-accent rounded-lg px-4 py-2.5 text-sm
                   hover:bg-accent hover:text-background transition-all disabled:opacity-40"
      >
        {state === "busy" ? "Saving…" : "Save"}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-sm text-muted hover:text-accent">
        Cancel
      </button>
      {error && <p className="w-full text-sm text-red-400">{error}</p>}
    </form>
  );
}
