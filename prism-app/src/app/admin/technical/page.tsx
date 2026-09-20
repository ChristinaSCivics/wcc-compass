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
  cron: { lastDraftRun: string | null; draftsFromCron: number; autoWeaves: number };
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
      <p className="text-muted mb-8 text-sm max-w-2xl leading-relaxed">
        What runs, what it costs to run, and where everything lives.
      </p>

      {error && <p className="text-red-400 text-sm">{error}</p>}
      {!error && !data && <p className="text-muted text-sm">Loading…</p>}

      {data && (
        <>
          <Section title="Which model does which job">
            <Row label="Conversation, synthesis, the weave" value={data.models.conversation} />
            <Row label="Turning a transcript into a draft" value={data.models.extraction} />
            <P>
              These are different jobs. The conversation is the product — following what
              someone said and writing it back in their voice. Extraction is transcription
              into a known shape, inventing nothing, and it&apos;s the call made most often,
              so it runs on the cheaper model. Both are one environment variable from
              changing, including to a local model later.
            </P>
          </Section>

          <Section title="Calls made">
            <Row label="Conversation turns" value={data.calls.conversationTurns.toLocaleString()} />
            <Row label="Vision drafts" value={data.calls.visionDrafts.toLocaleString()} />
            <Row label="Decision input drafts" value={data.calls.decisionDrafts.toLocaleString()} />
            <Row label="Collective weaves" value={data.calls.weaves.toLocaleString()} />
            <Row label="Decision syntheses" value={data.calls.syntheses.toLocaleString()} />
            <P>
              Counted from records the app already keeps. <strong>Token usage isn&apos;t
              recorded anywhere</strong>, so these are honest call counts and not a bill —
              a long conversation and a short one both count as one turn each. If the
              number matters, it&apos;s worth logging usage per response.
            </P>
            {data.auditWindowFrom && (
              <P>
                Draft, weave and synthesis counts come from the audit log, which starts{" "}
                {new Date(data.auditWindowFrom).toLocaleDateString()}. Anything earlier is
                absent rather than zero.
                {data.auditTruncated && " The log is longer than this page reads."}
              </P>
            )}
          </Section>

          <Section title="Scheduled jobs">
            <Row
              label="Draft abandoned conversations"
              value="every 10 minutes · GitHub Actions"
            />
            <Row
              label="Last time it drafted anything"
              value={
                data.cron.lastDraftRun
                  ? new Date(data.cron.lastDraftRun).toLocaleString()
                  : "not yet"
              }
            />
            <Row label="Drafts it has rescued" value={data.cron.draftsFromCron.toLocaleString()} />
            <Row label="Automatic re-weaves" value={data.cron.autoWeaves.toLocaleString()} />
            <P>
              The job looks for conversations that have gone quiet for ten minutes with at
              least two things said, and drafts them once. It runs from GitHub Actions
              rather than Vercel Cron, which is once a day on the current plan. A quiet run
              that finds nothing is the normal case and costs nothing.
            </P>
            <P>
              Re-weaving happens when someone opens the collective page and voices have
              joined since the last weaving — at most once every 30 minutes, so a busy day
              batches up instead of paying per visitor.
            </P>
          </Section>

          <Section title="How it fits together">
            <P>
              <strong>Next.js 16</strong> on Vercel, <strong>React 19</strong>,{" "}
              <strong>Tailwind 4</strong>. The design system is CSS custom properties in{" "}
              <code className="text-accent">globals.css</code> — the palette is nine
              variables, which is why rebranding is a token swap rather than a refactor.
            </P>
            <P>
              <strong>Supabase</strong> holds everything: Postgres with row-level security,
              and anonymous auth so a visitor needs no account. Two clients — one that
              respects RLS for anything acting as a person, one service-role client for
              counts and cross-user work. The audit chain&apos;s hashes are computed by a
              Postgres trigger under an advisory lock, which is why the chain can&apos;t
              fork.
            </P>
            <P>
              <strong>Prism</strong> is the Anthropic API plus prompts kept in the public
              repo as plain TypeScript. Every extracted record is stamped with a hash of the
              prompt that produced it, so you can tell which version of the interview
              produced which vision.
            </P>
            <P>
              <strong>Deploys are manual</strong> — pushing to git does not deploy. The live
              site is one deployment reachable at three addresses:
              worldcocreation.com/demo redirects to demo.worldcocreation.com, which points
              at the same build as the Vercel URL.
            </P>
            <Row label="Conversations held" value={data.conversations.toLocaleString()} />
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

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted leading-relaxed pt-3">{children}</p>;
}
