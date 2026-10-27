"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { AdminNav } from "@/components/AdminNav";
import { getAdminName } from "@/lib/adminIdentity";
import { KeeperGate } from "@/components/KeeperGate";
import {
  getKeeperPassword,
  clearKeeperPassword,
  rememberKeeper,
} from "@/lib/keeperClient";

/**
 * The admin door. Sign in once here and the tools below open without asking
 * again — each of them used to demand the password separately, which made
 * getting in feel like it had failed even when it hadn't.
 *
 * Past the door it opens with the numbers rather than with prose. It used to
 * describe four tools in a paragraph each, which meant reading the page to
 * find out whether anything had happened; now it says how things stand, and
 * the tools are the way to drill in.
 *
 * Not linked from anywhere a visitor goes.
 */

type Overview = {
  people: number;
  entries: number;
  onMap: number;
  drafts: number;
  reachable: number;
  mastermind: number;
  saved: number;
  feedback: number;
  week: {
    arrived: number;
    conversations: number;
    confirmed: number;
    signups: number;
    feedback: number;
  };
  lastEvent: string | null;
  lastWeave: string | null;
  lastSignIn: string | null;
};
export default function Admin() {
  // Reading sessionStorage while rendering made the server draw the sign-in
  // form and the browser draw the tools, which React reports as a hydration
  // failure. Through useSyncExternalStore the server snapshot is simply "not
  // signed in", and the real answer arrives once hydration is done.
  const held = useSyncExternalStore(
    () => () => {},
    () => !!getKeeperPassword(),
    () => false
  );
  const who = useSyncExternalStore(
    () => () => {},
    () => getAdminName(),
    () => null
  );
  const [justSignedIn, setJustSignedIn] = useState(false);
  const unlocked = held || justSignedIn;
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [data, setData] = useState<Overview | null>(null);

  const loadOverview = useCallback(async () => {
    const keeperPassword = getKeeperPassword();
    if (!keeperPassword) return;
    const res = await fetch("/api/admin/overview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keeperPassword }),
    }).catch(() => null);
    if (res?.ok) setData(await res.json());
  }, []);

  async function check() {
    setChecking(true);
    setError(null);
    const keeperPassword = getKeeperPassword();
    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keeperPassword, actorName: getAdminName() }),
    }).catch(() => null);
    setChecking(false);

    if (!res) {
      setError("Couldn't reach the server.");
      return;
    }
    if (res.status === 403) {
      clearKeeperPassword();
      setError("That password wasn't right.");
      return;
    }
    if (!res.ok) {
      setError("Something went wrong signing in.");
      return;
    }
    rememberKeeper();
    setJustSignedIn(true);
    void loadOverview();
  }

  useEffect(() => {
    if (unlocked) void loadOverview();
  }, [unlocked, loadOverview]);

  return (
    <>
    {unlocked && <AdminNav />}
    {unlocked ? (
      <main className="min-h-screen max-w-4xl mx-auto w-full px-6 py-10">
        <div className="flex items-baseline justify-between gap-4 flex-wrap mb-6">
          <h1 className="text-4xl">{who ? `Hello, ${who}` : "Admin"}</h1>
          {data?.lastEvent && (
            <span className="text-xs text-muted">
              last activity {when(data.lastEvent)}
            </span>
          )}
        </div>

        {!data && <p className="text-muted text-sm mb-8">Counting…</p>}

        {data && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              <Big value={data.people} label="people" sub={`${data.entries} entries`} href="/admin/members" />
              <Big value={data.onMap} label="on the map" sub={`${data.drafts} in draft`} href="/collective" />
              <Big value={data.reachable} label="we can reach" sub={`${data.mastermind} for the call`} href="/admin/contacts" />
              <Big value={data.feedback} label="feedback" sub="from the ✎ button" href="/admin/feedback" />
            </div>

            <div className="rounded-xl border border-borderline bg-surface px-5 py-4 mb-8">
              <span className="block text-xs text-muted tracking-[0.16em] uppercase mb-2">
                Last 7 days
              </span>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                <Since n={data.week.arrived} one="person arrived" many="people arrived" />
                <Since n={data.week.conversations} one="conversation" many="conversations" />
                <Since n={data.week.confirmed} one="vision confirmed" many="visions confirmed" />
                <Since n={data.week.signups} one="asked for the call" many="asked for the call" />
                <Since n={data.week.feedback} one="note of feedback" many="notes of feedback" />
              </div>
            </div>
          </>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Tool href="/admin/members" title="People" sub="Who came, how far they got, which are sandboxes" />
          <Tool href="/admin/funnel" title="Journey" sub="Where people stop, and where they came from" />
          <Tool href="/admin/contacts" title="Emails" sub="Who we can reach, and how they reach Fibery and EmailOctopus" />
          <Tool href="/admin/feedback" title="Feedback" sub="What people sent from the ✎ button" />
          <Tool href="/admin/technical" title="Technical" sub="Models, jobs, call counts, who signed in" />
          <Tool href="/audit" title="Record" sub="Every event, in order, hash-chained" />
        </div>

        <p className="text-xs text-muted/70 mt-8 leading-relaxed">
          To walk the product without touching the collective, enter through{" "}
          <a href="/test" className="text-accent underline">/test</a>.
        </p>
      </main>
    ) : (
      <KeeperGate error={error} onSubmit={() => void check()} busy={checking} />
    )}
    </>
  );
}

function Tool({ href, title, sub }: { href: string; title: string; sub: string }) {
  return (
    <Link
      href={href}
      className="block rounded-xl border border-borderline bg-surface px-5 py-4 transition-all hover:border-accent"
    >
      <h2 className="text-base">{title}</h2>
      <p className="text-xs text-muted leading-relaxed mt-0.5">{sub}</p>
    </Link>
  );
}

/** A number first, and the way to the page that explains it. */
function Big({
  value, label, sub, href,
}: { value: number; label: string; sub: string; href: string }) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-borderline bg-surface px-4 py-4 transition-all hover:border-accent"
    >
      <span className="block text-3xl text-accent tabular-nums leading-none">{value}</span>
      <span className="block text-sm mt-1.5">{label}</span>
      <span className="block text-xs text-muted mt-0.5">{sub}</span>
    </Link>
  );
}

function Since({ n, one, many }: { n: number; one: string; many: string }) {
  return (
    <span className={n === 0 ? "text-muted/50" : ""}>
      <span className={`tabular-nums ${n === 0 ? "" : "text-accent"}`}>{n}</span>{" "}
      {n === 1 ? one : many}
    </span>
  );
}

/** "3 minutes ago" beats a timestamp for the one thing this page says in words. */
function when(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.round(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
}
