"use client";

import { useCallback, useEffect, useState } from "react";
import { TopNav } from "@/components/TopNav";
import { getKeeperPassword, clearKeeperPassword } from "@/lib/keeperClient";

type Member = {
  id: string;
  name: string;
  saved: boolean;
  role: string;
  isTest: boolean;
  joinedAt: string;
  joinedFrom: string | null;
  visionStatus: "none" | "draft" | "confirmed";
  visionHidden: boolean;
  confirmedInputs: number;
  conversations: number;
  lastActive: string | null;
};

/** Keeper-only roster. Not linked in the nav — share the URL with keepers. */
export default function Members() {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  const load = useCallback(async () => {
    const keeperPassword = getKeeperPassword();
    if (!keeperPassword) {
      setError("Keeper password required.");
      return;
    }
    const res = await fetch("/api/keeper/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keeperPassword }),
    });
    if (res.status === 403) {
      clearKeeperPassword();
      setError("That keeper password wasn't right — reload to try again.");
      return;
    }
    if (!res.ok) {
      setError("Couldn't load the roster.");
      return;
    }
    setMembers((await res.json()).members);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function flag(m: Member) {
    setPending(m.id);
    const res = await fetch("/api/keeper/members", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        keeperPassword: getKeeperPassword(),
        userId: m.id,
        isTest: !m.isTest,
      }),
    });
    setPending(null);
    if (!res.ok) {
      setError("Couldn't update that account.");
      return;
    }
    setMembers((prev) =>
      (prev ?? []).map((p) => (p.id === m.id ? { ...p, isTest: !p.isTest } : p))
    );
  }

  const real = (members ?? []).filter((m) => !m.isTest);
  const test = (members ?? []).filter((m) => m.isTest);
  const onMap = real.filter((m) => m.visionStatus === "confirmed").length;

  return (
    <>
    <TopNav />
    <main className="min-h-screen max-w-4xl mx-auto w-full px-6 py-10">
      <h1 className="text-4xl mb-3">Who&rsquo;s here</h1>
      <p className="text-muted mb-4 text-sm max-w-2xl leading-relaxed">
        Everyone who has entered the Compass. Marking someone as a test account
        removes them from the weave, decision synthesis, and the member counts —
        their conversations are kept, just set aside. Keeper-only page.
      </p>
      <p className="text-sm text-muted mb-8">
        To walk the system without touching the collective, enter through{" "}
        <a href="/login?test=1" className="text-gold underline">
          /login?test=1
        </a>{" "}
        — that identity is sandboxed from the start.
      </p>

      {error && <p className="text-red-400 text-sm">{error}</p>}
      {!error && members === null && <p className="text-muted text-sm">Loading…</p>}

      {members && (
        <div className="flex flex-wrap gap-6 mb-8 text-sm">
          <Stat label="members" value={real.length} />
          <Stat label="on the map" value={onMap} />
          <Stat label="test accounts" value={test.length} />
        </div>
      )}

      {!!real.length && <Table rows={real} onFlag={flag} pending={pending} />}

      {!!test.length && (
        <>
          <h2 className="text-lg mt-10 mb-3 text-muted">Test accounts</h2>
          <Table rows={test} onFlag={flag} pending={pending} />
        </>
      )}

      {members?.length === 0 && <p className="text-muted text-sm">Nobody yet.</p>}
    </main>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <span className="text-2xl text-gold tabular-nums">{value}</span>
      <span className="text-muted ml-2">{label}</span>
    </div>
  );
}

function Table({
  rows, onFlag, pending,
}: {
  rows: Member[];
  onFlag: (m: Member) => void;
  pending: string | null;
}) {
  return (
    <div className="space-y-px">
      {rows.map((m) => (
        <div
          key={m.id}
          className="flex items-baseline gap-4 border-b border-borderline py-3 text-sm flex-wrap"
        >
          <div className="flex-1 min-w-[12rem]">
            <span className={m.isTest ? "text-muted" : "text-gold"}>{m.name}</span>
            {m.saved && <span className="text-xs text-muted ml-2">· saved spot</span>}
            {m.role !== "member" && (
              <span className="text-xs text-muted ml-2">· {m.role}</span>
            )}
            <div className="text-xs text-muted mt-1">
              joined {new Date(m.joinedAt).toLocaleDateString()}
              {m.joinedFrom && <> · {m.joinedFrom}</>}
              {m.lastActive && <> · last active {new Date(m.lastActive).toLocaleDateString()}</>}
            </div>
          </div>

          <div className="text-xs text-muted shrink-0 w-40">
            <div>
              vision:{" "}
              <span className={m.visionStatus === "confirmed" ? "text-gold" : ""}>
                {m.visionStatus}
              </span>
              {m.visionHidden && " (hidden)"}
            </div>
            <div>
              {m.conversations} conversation{m.conversations === 1 ? "" : "s"} ·{" "}
              {m.confirmedInputs} input{m.confirmedInputs === 1 ? "" : "s"}
            </div>
          </div>

          <button
            onClick={() => onFlag(m)}
            disabled={pending === m.id}
            className="text-xs border border-borderline rounded-full px-3 py-1 shrink-0
                       hover:border-gold hover:text-gold transition-all disabled:opacity-40"
          >
            {pending === m.id ? "…" : m.isTest ? "Mark as real" : "Mark as test"}
          </button>
        </div>
      ))}
    </div>
  );
}
