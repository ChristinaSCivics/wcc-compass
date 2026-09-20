"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminNav } from "@/components/AdminNav";
import { DateRange, type Range } from "@/components/DateRange";
import { getKeeperPassword, clearKeeperPassword, rememberKeeper } from "@/lib/keeperClient";

type Bar = { label: string; count: number };
type Data = {
  funnel: { step: string; count: number }[];
  depth: Bar[];
  devices: Bar[];
  regions: Bar[];
  cities: Bar[];
  testExcluded: number;
};

/** Keeper-only. Not linked in the nav — share the URL with keepers. */
export default function Funnel() {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<Range>({ since: null, until: null });


  // Signing in happens at /admin now, so by the time anyone is here they
  // either hold the password or get sent back to the door.
  const load = useCallback(async () => {
    const keeperPassword = getKeeperPassword();
    if (!keeperPassword) {
      router.replace("/admin");
      return;
    }
    const res = await fetch("/api/admin/funnel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keeperPassword, since: range.since, until: range.until }),
    });
    if (res.status === 403) {
      clearKeeperPassword();
      router.replace("/admin");
      return;
    }
    if (!res.ok) {
      setError("Couldn't load the numbers.");
      return;
    }
    rememberKeeper();
    setData(await res.json());
  }, [router, range]);

  useEffect(() => {
    void load();
  }, [load]);

  const top = data?.funnel[0]?.count ?? 0;

  return (
    <>
    <AdminNav />
    <main className="min-h-screen max-w-4xl mx-auto w-full px-6 py-10">
      <h1 className="text-4xl mb-3">How far people get</h1>
      <p className="text-muted mb-8 text-sm max-w-2xl leading-relaxed">
        Built from what the app already records — arrivals, conversations, how much
        someone actually said, and what they confirmed. Sandbox accounts are left out.
        {data ? ` ${data.testExcluded} test ${data.testExcluded === 1 ? "account" : "accounts"} excluded.` : ""}
      </p>

      {!data && !error && <p className="text-muted text-sm">Loading…</p>}
      <DateRange
        range={range}
        onChange={setRange}
        count={data ? `${data.funnel[0]?.count ?? 0} arrived in this window` : undefined}
      />

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {data && (
        <>
          <Section title="The funnel">
            <div className="space-y-2">
              {data.funnel.map((f, i) => {
                const pct = top ? Math.round((f.count / top) * 100) : 0;
                const prev = i > 0 ? data.funnel[i - 1].count : null;
                const lost = prev !== null ? prev - f.count : 0;
                return (
                  <div key={f.step}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span>{f.step}</span>
                      <span className="text-muted tabular-nums shrink-0">
                        {f.count}
                        <span className="text-muted/60"> · {pct}%</span>
                        {lost > 0 && <span className="text-ember/80"> −{lost}</span>}
                      </span>
                    </div>
                    <div className="h-2 mt-1 rounded-full bg-borderline overflow-hidden">
                      <div
                        className="h-full rounded-full bg-accent/70"
                        style={{ width: `${Math.max(2, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>

          <Section title="How much people said">
            <Bars rows={data.depth} />
            <p className="text-xs text-muted/70 mt-3">
              Counted as their own messages, not Prism&apos;s — the deepest conversation
              each person had.
            </p>
          </Section>

          <div className="grid gap-4 sm:grid-cols-3 mt-6">
            <MiniSection title="Device"><Bars rows={data.devices} /></MiniSection>
            <MiniSection title="Region"><Bars rows={data.regions.slice(0, 6)} /></MiniSection>
            <MiniSection title="City"><Bars rows={data.cities.slice(0, 6)} /></MiniSection>
          </div>

          <p className="text-sm text-muted mt-8 leading-relaxed">
            This page is about the shape of the journey. For the people themselves —
            who they are, how far each one got, and what you can do about it — see{" "}
            <a href="/admin/members" className="text-accent underline">People</a>.
          </p>

          <p className="text-xs text-muted/70 mt-10 leading-relaxed">
            What this can&apos;t tell you: which buttons someone pressed, or the order
            they moved through pages. That needs click tracking, which we don&apos;t do —
            everything above is inferred from records the app keeps anyway.
          </p>
        </>
      )}
    </main>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-borderline bg-surface p-6 mt-6">
      <h2 className="text-lg mb-4">{title}</h2>
      {children}
    </section>
  );
}

function MiniSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-borderline bg-surface p-5">
      <h2 className="text-xs text-muted tracking-widest uppercase mb-3">{title}</h2>
      {children}
    </section>
  );
}

function Bars({ rows }: { rows: Bar[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  if (!rows.length) return <p className="text-sm text-muted">No data yet.</p>;
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate">{r.label}</span>
            <span className="text-muted tabular-nums shrink-0">{r.count}</span>
          </div>
          <div className="h-1.5 mt-1 rounded-full bg-borderline overflow-hidden">
            <div
              className="h-full rounded-full bg-teal/70"
              style={{ width: `${Math.max(3, (r.count / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
