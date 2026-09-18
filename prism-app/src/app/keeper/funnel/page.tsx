"use client";

import { useState } from "react";
import { TopNav } from "@/components/TopNav";
import { getKeeperPassword, clearKeeperPassword, rememberKeeper } from "@/lib/keeperClient";

type Bar = { label: string; count: number };
type Person = {
  name: string;
  joinedAt: string;
  city: string | null;
  region: string | null;
  device: string | null;
  exchanges: number;
  furthest: string;
  askedForCall: boolean;
};
type Data = {
  funnel: { step: string; count: number }[];
  depth: Bar[];
  devices: Bar[];
  regions: Bar[];
  cities: Bar[];
  people: Person[];
  testExcluded: number;
};

/** Keeper-only. Not linked in the nav — share the URL with keepers. */
export default function Funnel() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  // Loaded on a click rather than on mount: the keeper password comes from a
  // window.prompt, and firing that at whoever opens the page — plus fetching
  // inside an effect — is both worse UX and the thing the lint rule is about.
  async function load() {
    setLoading(true);
    setError(null);
    const keeperPassword = getKeeperPassword();
    if (!keeperPassword) {
      setError("Keeper password required.");
      setLoading(false);
      return;
    }
    const res = await fetch("/api/keeper/funnel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keeperPassword }),
    });
    setLoading(false);
    if (res.status === 403) {
      clearKeeperPassword();
      setError("That keeper password wasn't right — try again.");
      return;
    }
    if (!res.ok) {
      setError("Couldn't load the numbers.");
      return;
    }
    rememberKeeper();
    setData(await res.json());
  }

  const top = data?.funnel[0]?.count ?? 0;

  return (
    <>
    <TopNav />
    <main className="min-h-screen max-w-4xl mx-auto w-full px-6 py-10">
      <h1 className="text-4xl mb-3">How far people get</h1>
      <p className="text-muted mb-8 text-sm max-w-2xl leading-relaxed">
        Built from what the app already records — arrivals, conversations, how much
        someone actually said, and what they confirmed. Sandbox accounts are left out.
        {data ? ` ${data.testExcluded} test ${data.testExcluded === 1 ? "account" : "accounts"} excluded.` : ""}
      </p>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {!data && (
        <button
          onClick={() => void load()}
          disabled={loading}
          className="border border-accent text-accent rounded-full px-6 py-2.5
                     hover:bg-accent hover:text-background transition-all disabled:opacity-40"
        >
          {loading ? "Counting…" : "Show the numbers"}
        </button>
      )}

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

          <Section title="Everyone, most recent first">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted text-xs uppercase tracking-widest">
                    <th className="py-2 pr-4 font-normal">Name</th>
                    <th className="py-2 pr-4 font-normal">Arrived</th>
                    <th className="py-2 pr-4 font-normal">From</th>
                    <th className="py-2 pr-4 font-normal">Said</th>
                    <th className="py-2 pr-4 font-normal">Got as far as</th>
                    <th className="py-2 font-normal">Call</th>
                  </tr>
                </thead>
                <tbody>
                  {data.people.map((p, i) => (
                    <tr key={i} className="border-t border-borderline">
                      <td className="py-2 pr-4">{p.name}</td>
                      <td className="py-2 pr-4 text-muted whitespace-nowrap">
                        {new Date(p.joinedAt).toLocaleDateString()}
                      </td>
                      <td className="py-2 pr-4 text-muted whitespace-nowrap">
                        {[p.city, p.region].filter(Boolean).join(", ") || "—"}
                        {p.device && <span className="text-muted/60"> · {p.device}</span>}
                      </td>
                      <td className="py-2 pr-4 tabular-nums">{p.exchanges}</td>
                      <td className="py-2 pr-4">{p.furthest}</td>
                      <td className="py-2">{p.askedForCall ? "✓" : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

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
