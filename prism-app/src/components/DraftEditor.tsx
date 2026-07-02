"use client";

import { useState } from "react";

/**
 * Renders an extracted draft (JSON) as human-editable fields.
 * Strings -> textarea; string arrays -> one per line; objects -> JSON.
 * The member's edited version becomes the confirmed record — the LLM never
 * gets the last word on what a person means.
 */
export function DraftEditor({
  draft,
  onConfirm,
  confirming,
}: {
  draft: Record<string, unknown>;
  onConfirm: (edited: Record<string, unknown>) => void;
  confirming: boolean;
}) {
  const [fields, setFields] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(draft)) {
      if (v == null) out[k] = "";
      else if (typeof v === "string") out[k] = v;
      else if (Array.isArray(v) && v.every((x) => typeof x === "string"))
        out[k] = (v as string[]).join("\n");
      else out[k] = JSON.stringify(v, null, 2);
    }
    return out;
  });
  const [error, setError] = useState<string | null>(null);

  function reassemble(): Record<string, unknown> | null {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(fields)) {
      const original = draft[k];
      if (v.trim() === "") out[k] = null;
      else if (typeof original === "string" || original == null) out[k] = v;
      else if (Array.isArray(original) && original.every((x) => typeof x === "string"))
        out[k] = v.split("\n").map((s) => s.trim()).filter(Boolean);
      else {
        try {
          out[k] = JSON.parse(v);
        } catch {
          setError(`"${label(k)}" contains invalid JSON — fix it or clear the field.`);
          return null;
        }
      }
    }
    return out;
  }

  return (
    <div className="space-y-6">
      {Object.keys(fields).map((k) => (
        <div key={k}>
          <label className="block text-sm text-gold tracking-widest uppercase mb-2">
            {label(k)}
          </label>
          <textarea
            value={fields[k]}
            onChange={(e) => setFields((f) => ({ ...f, [k]: e.target.value }))}
            rows={Math.min(10, Math.max(2, fields[k].split("\n").length + 1))}
            className="w-full bg-surface border border-borderline rounded-xl px-4 py-3
                       focus:outline-none focus:border-gold transition-colors leading-relaxed"
          />
        </div>
      ))}
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button
        onClick={() => {
          setError(null);
          const edited = reassemble();
          if (edited) onConfirm(edited);
        }}
        disabled={confirming}
        className="w-full border border-gold text-gold rounded-xl py-4 text-lg
                   hover:bg-gold hover:text-background transition-all gold-glow disabled:opacity-40"
      >
        {confirming ? "Recording…" : "This is true to me — confirm it"}
      </button>
      <p className="text-xs text-muted text-center">
        Edit anything above first. Confirmation is recorded on the open, tamper-evident log.
      </p>
    </div>
  );
}

function label(key: string) {
  return key.replace(/_/g, " ");
}
