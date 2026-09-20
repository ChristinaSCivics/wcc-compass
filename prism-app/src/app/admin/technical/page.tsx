"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminNav } from "@/components/AdminNav";
import { getKeeperPassword, clearKeeperPassword, rememberKeeper } from "@/lib/keeperClient";

type Data = {
  models: { conversation: string; extraction: string };
  calls: {
    conversationTurns: number;
    visionDrafts: number;
    decisionDrafts: number;
    weaves: number;
    syntheses: number;
  };
  conversations: number;
  cron: {
    lastDraftRun: string | null;
    draftsFromCron: number;
    autoWeaves: number;
    lastWeave: string | null;
  };
  admin: {
    signIns: { at: string; name: string; where: string | null; device: string | null }[];
    failures: { at: string; name: string | null; where: string | null }[];
    names: string[];
  };
  auditWindowFrom: string | null;
  auditTruncated: boolean;
};

/** How the thing is put together, and what it's been doing. Keeper-only. */
export default function Technical() {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const keeperPassword = getKeeperPassword();
    if (!keeperPassword) {
      router.replace("/admin");
      return;
    }
    const res = await fetch("/api/admin/technical", {
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
      setError("Couldn't load the numbers.");
      return;
    }
    rememberKeeper();
    setData(await res.json());
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
    <AdminNav />
    <main className="min-h-screen max-w-4xl mx-auto w-full px-6 py-10">
      <h1 className="text-4xl mb-3">Under the hood</h1>
      <p className="text-muted mb-8 text-sm">
        What runs, when, and what it&apos;s been doing.
      </p>

      {error && <p className="text-red-400 text-sm">{error}</p>}
      {!error && !data && <p className="text-muted text-sm">Loading…</p>}

      {data && (
        <>
          <Section title="Which model does which job">
            <Row label="Conversation, synthesis, the weave" value={data.models.conversation} />
            <Row label="Turning a transcript into a draft" value={data.models.extraction} />
            <P>
              Two different jobs. The conversation has to follow someone and write back in
              their voice; extraction only shapes a transcript into known fields, so it
              runs on the cheaper model. Either is one environment variable from changing.
            </P>
          </Section>

          <Section title="Calls made">
            <Row label="Conversation turns" value={data.calls.conversationTurns.toLocaleString()} />
            <Row label="Vision drafts" value={data.calls.visionDrafts.toLocaleString()} />
            <Row label="Decision input drafts" value={data.calls.decisionDrafts.toLocaleString()} />
            <Row label="Collective weaves" value={data.calls.weaves.toLocaleString()} />
            <Row label="Decision syntheses" value={data.calls.syntheses.toLocaleString()} />
            <P>
              <strong>These are calls, not a bill.</strong> Token usage isn&apos;t recorded
              anywhere, so a long conversation and a short one each count as one turn.
            </P>
            {data.auditWindowFrom && (
              <P>
                Counted from the record, which starts{" "}
                {new Date(data.auditWindowFrom).toLocaleDateString()} — anything earlier is
                absent rather than zero.
                {data.auditTruncated && " The record is longer than this page reads."}
              </P>
            )}
          </Section>

          <Section title="What runs on its own">
            <Job
              name="Draft abandoned conversations"
              when="Every 10 minutes, on the clock"
              where="GitHub Actions"
              only="Only drafts a conversation that has been quiet for 10 minutes with at
                    least two exchanges and no draft yet. A run that finds nothing makes no
                    model call and costs nothing — that's most runs."
              stats={[
                ["Last time it drafted something", data.cron.lastDraftRun
                  ? new Date(data.cron.lastDraftRun).toLocaleString()
                  : "not yet"],
                ["Drafts it has rescued", data.cron.draftsFromCron.toLocaleString()],
              ]}
            />
            <Job
              name="Re-weave the collective vision"
              when="Only when the map has changed"
              where="Not a cron job"
              only="Nothing runs on a timer here. When someone opens the collective page,
                    the page checks whether a vision has been confirmed since the last
                    weaving. If none has, nothing happens. If one has, Prism weaves once —
                    and then not again for 30 minutes however many people visit."
              stats={[
                ["Last weaving", data.cron.lastWeave
                  ? new Date(data.cron.lastWeave).toLocaleString()
                  : "not yet"],
                ["Woven automatically", data.cron.autoWeaves.toLocaleString()],
                ["Woven in total", data.calls.weaves.toLocaleString()],
              ]}
            />
            <P>
              A keeper can force a weaving from the foot of the collective page, which
              skips the 30-minute wait. Nothing else calls a model without someone doing
              something first.
            </P>
          </Section>

          <Section title="Who has been in here">
            <p className="text-sm text-muted leading-relaxed mb-4">
              One password, shared between three people, so the name is the one picked at
              the door — a signature, not proof. Every sign-in and every wrong guess is
              written to the record.
            </p>
            {!data.admin.signIns.length && (
              <p className="text-sm text-muted">
                No sign-ins recorded yet — this started counting when the door began
                writing them down.
              </p>
            )}
            {data.admin.signIns.map((s, i) => (
              <Row
                key={`${s.at}-${i}`}
                label={`${s.name}${s.where ? ` · ${s.where}` : ""}${s.device ? ` · ${s.device}` : ""}`}
                value={new Date(s.at).toLocaleString()}
              />
            ))}
            {!!data.admin.failures.length && (
              <>
                <p className="text-sm text-amber mt-5 mb-2">
                  {data.admin.failures.length} wrong{" "}
                  {data.admin.failures.length === 1 ? "password" : "passwords"} entered
                </p>
                {data.admin.failures.map((f, i) => (
                  <Row
                    key={`${f.at}-${i}`}
                    label={`${f.name ?? "no name given"}${f.where ? ` · ${f.where}` : ""}`}
                    value={new Date(f.at).toLocaleString()}
                  />
                ))}
                <P>
                  A few of these are someone mistyping. A run of them from somewhere none
                  of us is means the password has got out, and it&apos;s one environment
                  variable to change.
                </P>
              </>
            )}
          </Section>

          <Section title="How it fits together">
            <Row label="App" value="Next.js 16 · React 19 · Tailwind 4, on Vercel" />
            <Row label="Data" value="Supabase Postgres · row-level security · anonymous auth" />
            <Row label="Prism" value="Anthropic API · prompts in the public repo" />
            <Row label="Deploys" value="manual — pushing to git does not deploy" />
            <Row label="Conversations held" value={data.conversations.toLocaleString()} />
            <P>
              The palette is nine CSS variables in{" "}
              <code className="text-accent">globals.css</code>, so a rebrand is a token
              swap. Every drafted record is stamped with a hash of the prompt that made it.
              The record&apos;s hashes are computed by a Postgres trigger under a lock, so
              the chain can&apos;t fork. One deployment serves worldcocreation.com/demo,
              demo.worldcocreation.com and the Vercel URL.
            </P>
          </Section>
        </>
      )}
    </main>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-borderline bg-surface p-6 mb-6">
      <h2 className="text-lg mb-4">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm border-b border-borderline py-2 last:border-0">
      <span className="text-muted">{label}</span>
      <span className="tabular-nums text-right">{value}</span>
    </div>
  );
}

/** One thing that happens without a person asking, and the rule that governs it. */
function Job({
  name, when, where, only, stats,
}: {
  name: string;
  when: string;
  where: string;
  only: string;
  stats: [string, string][];
}) {
  return (
    <div className="border-b border-borderline pb-5 mb-5 last:border-0 last:pb-0 last:mb-0">
      <div className="flex items-baseline justify-between gap-4 flex-wrap">
        <h3 className="text-foreground">{name}</h3>
        <span className="text-xs text-accent">{when}</span>
      </div>
      <p className="text-xs text-muted/70 mb-2">{where}</p>
      {/* Written across several lines in the source; a JSX attribute keeps every
          one of those newlines, so they're collapsed back to sentences here. */}
      <p className="text-sm text-muted leading-relaxed mb-3">{only.replace(/\s+/g, " ")}</p>
      {stats.map(([label, value]) => (
        <Row key={label} label={label} value={value} />
      ))}
    </div>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted leading-relaxed pt-3">{children}</p>;
}
