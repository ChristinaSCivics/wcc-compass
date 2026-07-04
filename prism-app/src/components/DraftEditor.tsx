"use client";

import { useState } from "react";

/**
 * Renders an extracted draft (JSON) as human-editable fields.
 * Strings -> textarea; string arrays -> one per line; arrays of flat objects
 * (e.g. core_values: [{value, their_definition}]) -> labeled item cards.
 * The member's edited version becomes the confirmed record — the LLM never
 * gets the last word on what a person means.
 */

type ObjItem = Record<string, string>;

function isFlatObjectArray(v: unknown): v is Record<string, unknown>[] {
  return (
    Array.isArray(v) &&
    v.length > 0 &&
    v.every(
      (x) =>
        x !== null &&
        typeof x === "object" &&
        !Array.isArray(x) &&
        Object.values(x).every((val) => val == null || typeof val === "string" || typeof val === "boolean")
    )
  );
}

export function DraftEditor({
  draft,
  onConfirm,
  confirming,
}: {
  draft: Record<string, unknown>;
  onConfirm: (edited: Record<string, unknown>) => void;
  confirming: boolean;
}) {
  // simple text fields
  const [fields, setFields] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(draft)) {
      if (isFlatObjectArray(v)) continue;
      if (v == null) out[k] = "";
      else if (typeof v === "string") out[k] = v;
      else if (typeof v === "boolean") out[k] = v ? "yes" : "no";
      else if (Array.isArray(v) && v.every((x) => typeof x === "string"))
        out[k] = (v as string[]).join("\n");
      else out[k] = JSON.stringify(v, null, 2);
    }
    return out;
  });

  // arrays of flat objects -> item cards
  const [objArrays, setObjArrays] = useState<Record<string, ObjItem[]>>(() => {
    const out: Record<string, ObjItem[]> = {};
    for (const [k, v] of Object.entries(draft)) {
      if (isFlatObjectArray(v)) {
        out[k] = v.map((item) =>
          Object.fromEntries(
            Object.entries(item).map(([ik, iv]) => [ik, iv == null ? "" : String(iv)])
          )
        );
      }
    }
    return out;
  });

  const [error, setError] = useState<string | null>(null);

  function setObjField(field: string, idx: number, key: string, value: string) {
    setObjArrays((prev) => {
      const items = [...prev[field]];
      items[idx] = { ...items[idx], [key]: value };
      return { ...prev, [field]: items };
    });
  }

  function removeObjItem(field: string, idx: number) {
    setObjArrays((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== idx),
    }));
  }

  function addObjItem(field: string) {
    setObjArrays((prev) => {
      const template = prev[field][0] ?? {};
      const empty = Object.fromEntries(Object.keys(template).map((k) => [k, ""]));
      return { ...prev, [field]: [...prev[field], empty] };
    });
  }

  function reassemble(): Record<string, unknown> | null {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(fields)) {
      const original = draft[k];
      if (v.trim() === "") out[k] = null;
      else if (typeof original === "string" || original == null || typeof original === "boolean")
        out[k] = v;
      else if (Array.isArray(original) && original.every((x) => typeof x === "string"))
        out[k] = v.split("\n").map((s) => s.trim()).filter(Boolean);
      else {
        try {
          out[k] = JSON.parse(v);
        } catch {
          setError(`"${label(k)}" contains invalid formatting — fix it or clear the field.`);
          return null;
        }
      }
    }
    for (const [k, items] of Object.entries(objArrays)) {
      out[k] = items.filter((item) => Object.values(item).some((val) => val.trim() !== ""));
    }
    return out;
  }

  // preserve the draft's field order in the UI
  const orderedKeys = Object.keys(draft);

  return (
    <div className="space-y-6">
      {orderedKeys.map((k) =>
        k in objArrays ? (
          <div key={k}>
            <label className="block text-sm text-gold tracking-widest uppercase mb-2">
              {label(k)}
            </label>
            <div className="space-y-3">
              {objArrays[k].map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-borderline bg-surface p-4 space-y-2 relative"
                >
                  <button
                    type="button"
                    onClick={() => removeObjItem(k, idx)}
                    title="Remove"
                    className="absolute top-2 right-3 text-muted/50 hover:text-red-400 transition-colors"
                  >
                    ×
                  </button>
                  {Object.entries(item).map(([ik, iv]) => (
                    <div key={ik}>
                      <label className="block text-xs text-muted mb-1">{label(ik)}</label>
                      <textarea
                        value={iv}
                        onChange={(e) => setObjField(k, idx, ik, e.target.value)}
                        rows={Math.min(4, Math.max(1, iv.split("\n").length))}
                        className="w-full bg-surface-raised border border-borderline rounded-lg px-3 py-2 text-sm
                                   focus:outline-none focus:border-gold transition-colors leading-relaxed"
                      />
                    </div>
                  ))}
                </div>
              ))}
              <button
                type="button"
                onClick={() => addObjItem(k)}
                className="text-xs text-muted hover:text-gold transition-colors"
              >
                + add another
              </button>
            </div>
          </div>
        ) : k in fields ? (
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
        ) : null
      )}
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
