"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminNav } from "@/components/AdminNav";
import { DateRange, withinRange, type Range } from "@/components/DateRange";
import { getAdminName } from "@/lib/adminIdentity";
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

/** What Fibery knows about one of these people, and how sure we are of it. */
type FiberyMatch = {
  id: string;
  kind: "email" | "name" | "maybe" | "ambiguous" | "none";
  fiberyName?: string;
  fiberyUrl?: string;
  fiberyHasEmail?: boolean;
  candidates?: { name: string; url: string }[];
};

type FiberyState =
  | { state: "loading" }
  | { state: "off" }
  | { state: "error"; message: string }
  | { state: "on"; peopleInFibery: number; byContact: Map<string, FiberyMatch> };

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
  const [fibery, setFibery] = useState<FiberyState>({ state: "loading" });
  const [pushing, setPushing] = useState(false);
  const [pushResult, setPushResult] = useState<string | null>(null);

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

  const loadFibery = useCallback(async () => {
    const keeperPassword = getKeeperPassword();
    if (!keeperPassword) return;
    const res = await fetch("/api/admin/fibery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keeperPassword, action: "status" }),
    }).catch(() => null);
    if (!res) {
      setFibery({ state: "error", message: "Couldn't reach the server." });
      return;
    }
    const body = await res.json().catch(() => null);
    if (!body?.connected) {
      setFibery({ state: "off" });
      return;
    }
    if (!res.ok || body.error) {
      setFibery({ state: "error", message: body?.error ?? "Fibery didn't answer." });
      return;
    }
    setFibery({
      state: "on",
      peopleInFibery: body.peopleInFibery ?? 0,
      byContact: new Map((body.contacts ?? []).map((c: FiberyMatch) => [c.id, c])),
    });
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void loadFibery(); }, [loadFibery]);

  async function push() {
    const newOnes = fiberySummary.missing;
    const sure = window.confirm(
      `Create ${newOnes} new ${newOnes === 1 ? "record" : "records"} in Fibery, and fill in emails ` +
      `where a record has none? Records that already exist are left exactly as they are, and ` +
      `anyone matched only by a first name is left for you to confirm by hand.`
    );
    if (!sure) return;
    setPushing(true);
    setPushResult(null);
    const res = await fetch("/api/admin/fibery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        keeperPassword: getKeeperPassword(),
        action: "sync",
        actorName: getAdminName(),
      }),
    }).catch(() => null);
    setPushing(false);
    const body = res ? await res.json().catch(() => null) : null;
    if (!res?.ok || !body) {
      setPushResult("That didn't go through. Nothing was written.");
      return;
    }
    setPushResult(
      `Created ${body.created?.length ?? 0}, filled in ${body.filled?.length ?? 0} ` +
      `${(body.filled?.length ?? 0) === 1 ? "email" : "emails"}, left ${body.skipped?.length ?? 0} alone.`
    );
    void loadFibery();
  }

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

  const fiberySummary = {
    known: 0,
    maybe: 0,
    missing: 0,
  };
  if (fibery.state === "on") {
    for (const p of reachable) {
      const m = fibery.byContact.get(p.id);
      if (!m || m.kind === "none") fiberySummary.missing++;
      else if (m.kind === "email" || m.kind === "name") fiberySummary.known++;
      else fiberySummary.maybe++;
    }
  }

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
          {copied && <p className="text-xs text-accent mb-4">{copied}</p>}

          <section className="rounded-xl border border-borderline bg-surface p-5 mb-8">
            <div className="flex items-baseline justify-between gap-4 flex-wrap mb-2">
              <h2 className="text-sm text-foreground">In the WCC workspace</h2>
              {fibery.state === "on" && (
                <span className="text-xs text-muted">
                  {fibery.peopleInFibery} people in Fibery
                </span>
              )}
            </div>

            {fibery.state === "loading" && (
              <p className="text-xs text-muted">Checking Fibery…</p>
            )}
            {fibery.state === "off" && (
              <p className="text-xs text-muted leading-relaxed">
                Not connected. Add a Fibery API token as{" "}
                <code className="text-accent">FIBERY_TOKEN</code> and this will show who is
                already in <span className="text-foreground">Relationships/People</span> and
                offer to add the rest.
              </p>
            )}
            {fibery.state === "error" && (
              <p className="text-xs text-red-400">{fibery.message}</p>
            )}

            {fibery.state === "on" && (
              <>
                <div className="flex flex-wrap gap-5 text-sm mb-3">
                  <Stat label="already there" value={fiberySummary.known} />
                  <Stat label="might be there" value={fiberySummary.maybe} />
                  <Stat label="not there yet" value={fiberySummary.missing} muted />
                </div>
                <p className="text-xs text-muted leading-relaxed mb-3">
                  Pushing creates a record for anyone Fibery hasn&rsquo;t met, and fills in
                  an email where a record has none. It never edits what someone wrote by
                  hand, and it never merges on a first name alone — those are flagged for
                  you to join up yourself.
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  <CopyButton
                    label={pushing ? "Pushing…" : `Push ${fiberySummary.missing} to Fibery`}
                    onClick={() => void push()}
                    disabled={pushing || !fiberySummary.missing}
                  />
                  {pushResult && <span className="text-xs text-accent">{pushResult}</span>}
                </div>
              </>
            )}
          </section>

          <section className="rounded-xl border border-borderline bg-surface p-5 mb-8">
            <div className="flex items-baseline justify-between gap-4 flex-wrap mb-2">
              <h2 className="text-sm text-foreground">In EmailOctopus</h2>
              <a
                href="https://emailoctopus.com/lists/4433d808-c28d-11f1-b998-fdd706948e05/contacts"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-accent underline"
              >
                Open the Audience list
              </a>
            </div>
            <p className="text-xs text-muted leading-relaxed mb-2">
              Automatic, nothing to push. The moment anyone gives an email here, they are
              added to the team&rsquo;s <span className="text-foreground">Audience</span> list,
              tagged with how they came in:
            </p>
            <ul className="text-xs text-muted leading-relaxed space-y-0.5 mb-2">
              <li><code className="text-accent">prism-beta</code> — everyone who came through the Compass</li>
              <li><code className="text-accent">prism-mastermind</code> — asked to be invited to the call</li>
              <li><code className="text-accent">prism-saved-spot</code> — saved their spot (Google or password)</li>
              <li><code className="text-accent">prism-connect</code> — finished the Connection Interview and said &ldquo;contact me&rdquo;, plus the team&rsquo;s <code className="text-accent">piece-*</code> / <code className="text-accent">help-*</code> tags read off their recap</li>
              <li><code className="text-accent">newsletter</code> + <code className="text-accent">source-beta</code> — <span className="text-foreground">only</span> when they ticked &ldquo;email me updates&rdquo; (on any form, or on their You page). This tag sends the welcome email.</li>
            </ul>
            <p className="text-xs text-muted leading-relaxed">
              Newsletters go to the <code className="text-accent">newsletter</code> segment, never
              the whole list — the list also holds people who only asked for the call link or
              saved a spot. Call links go to <code className="text-accent">prism-mastermind</code>.
              Test accounts are never added, and nobody who unsubscribed is ever re-subscribed.
              Runs on <code className="text-accent">EMAILOCTOPUS_API_KEY</code> in Vercel; to re-sync
              everything, run <code className="text-accent">scripts/backfill-emailoctopus.mts</code>.
            </p>
          </section>

          <Group
            title="In the mastermind"
            sub="Gave an email for the call."
            rows={mastermind}
            empty="Nobody has signed up for the call yet."
            fibery={fibery}
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
            fibery={fibery}
          />

          <Group
            title="Names only"
            sub="No email. If they lose this browser, their work goes with it."
            rows={namesOnly}
            empty="Everyone here has left us a way to reach them."
            quiet
            fibery={fibery}
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

/**
 * Whether Fibery already has this person, and on what evidence. An email is
 * proof; a full name is near enough; a lone first name is a lead, and says so
 * rather than quietly claiming a match.
 */
function InFibery({ match }: { match?: FiberyMatch }) {
  if (!match || match.kind === "none") {
    return <p className="text-xs text-muted/60 mt-1">not in Fibery</p>;
  }
  if (match.kind === "ambiguous") {
    return (
      <p className="text-xs text-amber/80 mt-1">
        could be {match.candidates?.map((c) => c.name).join(" or ")} — needs a person
      </p>
    );
  }
  const sure = match.kind === "email" || match.kind === "name";
  return (
    <p className={`text-xs mt-1 ${sure ? "text-teal" : "text-amber/80"}`}>
      {sure ? "in Fibery as " : "might be "}
      <a
        href={match.fiberyUrl}
        target="_blank"
        rel="noreferrer"
        className="underline underline-offset-2"
      >
        {match.fiberyName}
      </a>
      {sure && match.kind === "email" && " · matched on email"}
      {sure && match.kind === "name" && " · matched on name"}
      {!sure && " — same first name, confirm by hand"}
      {sure && match.fiberyHasEmail === false && " · no email on that record"}
    </p>
  );
}

function Group({
  title, sub, rows, empty, quiet, fibery,
}: {
  title: string;
  sub: string;
  rows: Person[];
  empty: string;
  quiet?: boolean;
  fibery?: FiberyState;
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
              {fibery?.state === "on" && <InFibery match={fibery.byContact.get(p.id)} />}
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
