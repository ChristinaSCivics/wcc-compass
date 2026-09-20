"use client";

import { useState } from "react";
import { setKeeperPassword } from "@/lib/keeperClient";
import { ADMINS, OTHER, setAdminName } from "@/lib/adminIdentity";
import { WccMark } from "./WccLogo";

/**
 * The admin door: who you are, and the shared password.
 *
 * A browser prompt used to ask for the password — suppressible, unstyled,
 * silent about what went wrong. This is a real sign-in screen, and it takes a
 * name so the record can say who acted rather than "someone holding the
 * password".
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
  const [name, setName] = useState<string>("");
  const [other, setOther] = useState("");
  const [value, setValue] = useState("");

  // "Other" keeps the list short without shutting anyone out — a fourth person
  // helping at the convention shouldn't have to sign as one of us.
  const chosen = name === OTHER ? other.trim() : name;
  const ready = !!chosen && !!value.trim();

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!ready) return;
          setAdminName(chosen);
          setKeeperPassword(value.trim());
          onSubmit();
        }}
        className="w-full max-w-sm text-center"
      >
        <div className="flex justify-center mb-6">
          <WccMark size={40} />
        </div>
        <h1 className="text-3xl mb-1">Admin</h1>
        <p className="text-sm text-muted mb-8">
          Shared password, so the record needs to know who you are.
        </p>

        <label className="block text-left text-[10px] text-teal tracking-[0.18em] uppercase mb-2">
          You are
        </label>
        <select
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-surface border border-borderline rounded-lg px-4 py-3 mb-4
                     focus:outline-none focus:border-accent transition-colors"
        >
          <option value="">Choose your name…</option>
          {ADMINS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
          <option value={OTHER}>Someone else…</option>
        </select>

        {name === OTHER && (
          <input
            type="text"
            value={other}
            onChange={(e) => setOther(e.target.value)}
            placeholder="Your name"
            autoFocus
            className="w-full bg-surface border border-borderline rounded-lg px-4 py-3 mb-4
                       focus:outline-none focus:border-accent transition-colors"
          />
        )}

        <label className="block text-left text-[10px] text-teal tracking-[0.18em] uppercase mb-2">
          Password
        </label>
        <input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Shared with circle keepers"
          className="w-full bg-surface border border-borderline rounded-lg px-4 py-3
                     focus:outline-none focus:border-accent transition-colors"
        />

        <button
          type="submit"
          disabled={!ready || busy}
          className="w-full mt-5 bg-accent text-background rounded-lg py-3
                     hover:bg-accent-soft transition-all disabled:opacity-40"
        >
          {busy ? "Checking…" : "Enter"}
        </button>

        {error && <p className="text-red-400 text-sm mt-4">{error}</p>}

        <p className="text-xs text-muted/70 mt-8 leading-relaxed">
          Whatever you change is written to the open record under the name you pick. The
          password is shared, so this is a signature rather than proof of who you are.
        </p>
      </form>
    </div>
  );
}
