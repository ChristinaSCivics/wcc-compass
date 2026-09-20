"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminNav } from "@/components/AdminNav";
import { DateRange, withinRange, type Range } from "@/components/DateRange";
import { getKeeperPassword, clearKeeperPassword, rememberKeeper } from "@/lib/keeperClient";

type Person = {
  id: string;
  name: string;
  savedEmail: string | null;
  mastermindEmail: string | null;
  mailingList: boolean;
  signedUpAt: string | null;
  joinedAt: string;
  place: string | null;
  visionStatus: string;
};

type Orphan = { email: string; mailingList: boolean; signedUpAt: string };

/**
 * Who we can reach, split the way it actually matters: a name with no way back,
 * an email that saves a spot, and an email given for the mastermind call.
 */
export default function Contacts() {
  const router = useRouter();
  const [people, setPeople] = useState<Person[] | null>(null);
  const [orphans, setOrphans] = useState<Orphan[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<Range>({ since: null, until: null });
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    const keeperPassword = getKeeperPassword();
    if (!keeperPassword) {
      router.replace("/admin");
      return;
    }
    const res = await fetch("/api/admin/contacts", {
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
      setError("Couldn't load contacts.");
      return;
    }
    rememberKeeper();
    const body = await res.json();
    setPeople(body.people);
    setOrphans(body.orphanSignups ?? []);
  }, [router]);

  useEffect(() => { void load(); }, [load]);

  async function copy(label: string, emails: string[]) {
    const unique = [...new Set(emails.filter(Boolean))];
    try {
      await navigator.clipboard.writeText(unique.join(", "));
      setCopied(`${label} — ${unique.length} ${unique.length === 1 ? "address" : "addresses"} copied`);
    } catch {
      setCopied("This browser wouldn't let the page copy — select and copy by hand.");
    }
  }

  const windowed = (people ?? []).filter(
    (p) => (!range.since && !range.until) || withinRange(p.joinedAt, range)
  );
  const mastermind = windowed.filter((p) => p.mastermindEmail);
  const saved = windowed.filter((p) => p.savedEmail && !p.mastermindEmail);
  const namesOnly = windowed.filter((p) => !p.savedEmail && !p.mastermindEmail);
  const reachable = windowed.filter((p) => p.savedEmail || p.mastermindEmail);

  return (
    <>
    <AdminNav />
    <main className="min-h-screen max-w-4xl mx-auto w-full px-6 py-10">
      <h1 className="text-4xl mb-3">Who we can reach</h1>
      <p className="text-muted mb-6 text-sm max-w-2xl leading-relaxed">
        A name with no email is someone we can&rsquo;t contact at all. A saved spot is an
        email given to come back to their own vision. A mastermind signup is an email given
        for the call — a different promise, so it&rsquo;s counted separately. Test accounts
        are left out.
      </p>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
      {people === null && !error && <p className="text-muted text-sm">Loading…</p>}

      <DateRange
        range={range}
        onChange={setRange}
        count={people ? `${windowed.length} of ${people.length} shown` : undefined}
      />

      {people && (
        <>
          <div className="flex flex-wrap gap-6 mb-6 text-sm">
            <Stat label="in the mastermind" value={mastermind.length} />
            <Stat label="saved their spot" value={saved.length} />
            <Stat label="names only — no way back" value={namesOnly.length} muted />
          </div>

          <div className="flex flex-wrap gap-2 mb-2 text-xs">
            <CopyButton
              label="Copy mastermind emails"
              onClick={() => copy("Mastermind", mastermind.map((p) => p.mastermindEmail!))}
              disabled={!mastermind.length}
            />
            <CopyButton
              label="Copy every email"
              onClick={() =>
                copy(
                  "Everyone reachable",
                  reachable.flatMap((p) => [p.mastermindEmail, p.savedEmail].filter(Boolean) as string[])
                )
              }
              disabled={!reachable.length}
            />
          </div>
          {copied && <p className="text-xs text-accent mb-6">{copied}</p>}
          {!copied && <div className="mb-6" />}

          <Group
            title="In the mastermind"
            sub="Gave an email for the call."
            rows={mastermind}
            empty="Nobody has signed up for the call yet."
          />

          {!!orphans.length && (
            <div className="mb-10 -mt-4">
              <p className="text-xs text-muted leading-relaxed">
                {orphans.length} {orphans.length === 1 ? "signup" : "signups"} came from an
                account that is marked as a test or no longer exists, and {orphans.length === 1 ? "isn't" : "aren't"}{" "}
                counted above:{" "}
                <span className="text-foreground">{orphans.map((o) => o.email).join(", ")}</span>
              </p>
            </div>
          )}

          <Group
            title="Saved their spot"
            sub="Gave an email so they could come back — not signed up for the call."
            rows={saved}
            empty="Nobody has saved a spot without also signing up."
          />

          <Group
            title="Names only"
            sub="No email. If they lose this browser, their work goes with it."
            rows={namesOnly}
            empty="Everyone here has left us a way to reach them."
            quiet
          />
        </>
      )}
    </main>
    </>
  );
}

function Stat({ label, value, muted }: { label: string; value: number; muted?: boolean }) {
  return (
    <div>
      <span className={`text-2xl tabular-nums ${muted ? "text-muted" : "text-accent"}`}>{value}</span>
      <span className="text-muted ml-2">{label}</span>
    </div>
  );
}

function CopyButton({
  label, onClick, disabled,
}: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-full border border-borderline px-3 py-1.5 text-muted
                 hover:border-accent hover:text-accent transition-colors disabled:opacity-40"
    >
      {label}
    </button>
  );
}

function Group({
  title, sub, rows, empty, quiet,
}: {
  title: string;
  sub: string;
  rows: Person[];
  empty: string;
  quiet?: boolean;
}) {
  return (
    <section className="mb-10">
      <h2 className={`text-lg ${quiet ? "text-muted" : ""}`}>{title}</h2>
      <p className="text-xs text-muted mb-3">{sub}</p>
      {!rows.length && <p className="text-sm text-muted">{empty}</p>}
      <div className="space-y-px">
        {rows.map((p) => (
          <div
            key={p.id}
            className="flex items-baseline gap-x-4 gap-y-1 border-b border-borderline py-3 text-sm flex-wrap"
          >
            <div className="flex-1 basis-full sm:basis-auto sm:min-w-[12rem] min-w-0">
              <span className={quiet ? "text-muted" : "text-accent"}>{p.name}</span>
              <div className="text-xs text-muted mt-1 break-words">
                joined {new Date(p.joinedAt).toLocaleDateString()}
                {p.place && <> · {p.place}</>}
                {p.visionStatus !== "none" && <> · vision {p.visionStatus}</>}
              </div>
            </div>
            <div className="w-full sm:w-auto sm:flex-1 min-w-0 text-xs break-all">
              {p.mastermindEmail && <div className="text-foreground">{p.mastermindEmail}</div>}
              {p.savedEmail && p.savedEmail !== p.mastermindEmail && (
                <div className="text-muted">
                  {p.savedEmail}
                  {p.mastermindEmail && " · saved spot"}
                </div>
              )}
              {!p.mastermindEmail && !p.savedEmail && (
                <span className="text-muted/60">no email</span>
              )}
            </div>
            <div className="text-xs text-muted shrink-0 w-full sm:w-36">
              {p.signedUpAt && <>signed up {new Date(p.signedUpAt).toLocaleDateString()}</>}
              {p.mailingList && <div className="text-accent/80">wants the mailing list</div>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
