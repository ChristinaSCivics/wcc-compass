"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminNav } from "@/components/AdminNav";
import { DateRange, withinRange, type Range } from "@/components/DateRange";
import { getAdminName } from "@/lib/adminIdentity";
import { getKeeperPassword, clearKeeperPassword, rememberKeeper } from "@/lib/keeperClient";

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
  said: number;
  furthest: string;
  askedForCall: boolean;
  lastActive: string | null;
  sameName: number;
};

/** Keeper-only roster. Not linked in the nav — share the URL with keepers. */
export default function Members() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[] | null>(null);
  const [peopleCount, setPeopleCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [range, setRange] = useState<Range>({ since: null, until: null });
  const [sort, setSort] = useState<SortKey>("joined");
  const [desc, setDesc] = useState(true);

  const load = useCallback(async () => {
    const keeperPassword = getKeeperPassword();
    if (!keeperPassword) {
      router.replace("/admin");
      return;
    }
    const res = await fetch("/api/admin/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keeperPassword }),
    });
    if (res.status === 403) {
      clearKeeperPassword();
      router.replace("/admin");
      return;
    }
    if (!res.ok) {
      setError("Couldn't load the roster.");
      return;
    }
    rememberKeeper();
    const body = await res.json();
    setMembers(body.members);
    setPeopleCount(body.peopleCount ?? null);
  }, [router]);

  useEffect(() => { void load(); }, [load]);

  async function flag(m: Member) {
    setPending(m.id);
    const res = await fetch("/api/admin/members", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        keeperPassword: getKeeperPassword(),
        userId: m.id,
        isTest: !m.isTest,
        actorName: getAdminName(),
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

  const windowed = (members ?? []).filter(
    (m) => (!range.since && !range.until) || withinRange(m.joinedAt, range)
  );
  const ordered = [...windowed].sort((a, b) => cmp(a, b, sort) * (desc ? -1 : 1));
  const real = ordered.filter((m) => !m.isTest);
  const test = ordered.filter((m) => m.isTest);
  const onMap = real.filter((m) => m.visionStatus === "confirmed").length;

  return (
    <>
    <AdminNav />
    <main className="min-h-screen max-w-4xl mx-auto w-full px-6 py-10">
      <h1 className="text-4xl mb-3">Who&rsquo;s here</h1>
      <p className="text-muted mb-8 text-sm max-w-2xl leading-relaxed">
        Everyone who has entered. Marking someone as a test sets their work aside — kept,
        but out of the weave, the synthesis and the counts. To try things yourself without
        touching the collective, enter at{" "}
        <a href="/test" className="text-accent underline">/test</a>.
      </p>

      {members === null && !error && <p className="text-muted text-sm">Loading…</p>}
      <DateRange
        range={range}
        onChange={setRange}
        count={members ? `${windowed.length} of ${members.length} shown` : undefined}
      />

      {members && (
        <div className="flex flex-wrap items-center gap-2 mb-5 text-xs">
          <span className="text-muted">Sort by</span>
          {SORTS.map((o) => (
            <button
              key={o.key}
              onClick={() => {
                if (sort === o.key) setDesc((d) => !d);
                else {
                  setSort(o.key);
                  setDesc(o.defaultDesc);
                }
              }}
              className={`rounded-full px-3 py-1.5 transition-colors ${
                sort === o.key
                  ? "bg-accent text-background"
                  : "border border-borderline text-muted hover:text-foreground"
              }`}
            >
              {o.label}
              {sort === o.key && (desc ? " ↓" : " ↑")}
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {members && (
        <>
          <div className="flex flex-wrap gap-6 mb-2 text-sm">
            {peopleCount !== null && <Stat label="people, by name" value={peopleCount} />}
            <Stat label="entries" value={real.length} />
            <Stat label="on the map" value={onMap} />
            <Stat label="test accounts" value={test.length} />
          </div>
          <p className="text-xs text-muted mb-8 max-w-2xl leading-relaxed">
            Entering without an account makes a new identity each time — a second browser,
            a phone, or a return after signing out. So <em>entries</em> counts arrivals and{" "}
            <em>people</em> groups them by name, which is all we have to go on. Repeats are
            marked below.
          </p>
        </>
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
      <span className="text-2xl text-accent tabular-nums">{value}</span>
      <span className="text-muted ml-2">{label}</span>
    </div>
  );
}

type SortKey = "name" | "joined" | "active" | "progress" | "said" | "conversations";

const SORTS: { key: SortKey; label: string; defaultDesc: boolean }[] = [
  { key: "joined", label: "Joined", defaultDesc: true },
  { key: "active", label: "Last active", defaultDesc: true },
  { key: "progress", label: "How far", defaultDesc: true },
  { key: "said", label: "How much said", defaultDesc: true },
  { key: "conversations", label: "Conversations", defaultDesc: true },
  { key: "name", label: "Name", defaultDesc: false },
];

/** How far someone got, as something orderable. */
const PROGRESS: Record<string, number> = { none: 0, draft: 1, confirmed: 2 };

function cmp(a: Member, b: Member, key: SortKey): number {
  switch (key) {
    case "name":
      return a.name.localeCompare(b.name);
    case "active":
      // Never active sorts as the oldest possible, so it lands at the far end
      // rather than jumbling in among real timestamps.
      return (
        new Date(a.lastActive ?? 0).getTime() - new Date(b.lastActive ?? 0).getTime()
      );
    case "progress":
      return (
        (PROGRESS[a.visionStatus] ?? 0) - (PROGRESS[b.visionStatus] ?? 0) ||
        a.said - b.said
      );
    case "said":
      return a.said - b.said;
    case "conversations":
      return a.conversations - b.conversations || a.confirmedInputs - b.confirmedInputs;
    case "joined":
    default:
      return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
  }
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
          className="flex items-baseline gap-x-4 gap-y-2 border-b border-borderline py-3 text-sm flex-wrap"
        >
          <div className="flex-1 basis-full sm:basis-auto sm:min-w-[12rem] min-w-0">
            <span className={m.isTest ? "text-muted" : "text-accent"}>{m.name}</span>
            {m.saved && <span className="text-xs text-muted ml-2">· saved spot</span>}
            {m.role !== "member" && (
              <span className="text-xs text-muted ml-2">· {m.role}</span>
            )}
            {m.sameName > 1 && (
              <span className="text-xs text-amber/80 ml-2">
                · 1 of {m.sameName} entries under this name
              </span>
            )}
            <div className="text-xs text-muted mt-1 break-words">
              joined {new Date(m.joinedAt).toLocaleDateString()}
              {m.joinedFrom && <> · {m.joinedFrom}</>}
              {m.lastActive && <> · last active {new Date(m.lastActive).toLocaleDateString()}</>}
            </div>
          </div>

          <div className="text-xs text-muted shrink-0 w-full sm:w-48">
            <div className={m.visionStatus === "confirmed" ? "text-accent" : ""}>
              {m.furthest}
            </div>
            <div>
              said {m.said} · {m.conversations} conversation
              {m.conversations === 1 ? "" : "s"} · {m.confirmedInputs} input
              {m.confirmedInputs === 1 ? "" : "s"}
              {m.visionHidden && " · vision hidden"}
            </div>
            {m.askedForCall && <div className="text-accent/80">asked for the call</div>}
          </div>

          <button
            onClick={() => onFlag(m)}
            disabled={pending === m.id}
            className="text-xs border border-borderline rounded-full px-3 py-1 shrink-0
                       hover:border-accent hover:text-accent transition-all disabled:opacity-40"
          >
            {pending === m.id ? "…" : m.isTest ? "Mark as real" : "Mark as test"}
          </button>
        </div>
      ))}
    </div>
  );
}
