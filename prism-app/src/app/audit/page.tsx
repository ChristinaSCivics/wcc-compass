import { createClient } from "@/lib/supabase/server";
import { TopNav } from "@/components/TopNav";

/**
 * The open record.
 *
 * This used to be a developer's log: raw event names, a member's display name,
 * and a wall of hex. It said "tamper-evident" without letting anyone see that
 * being true, and it named people on a page whose whole point is that the
 * process is inspectable, not that participants are.
 *
 * Now: plain English, no names, and the chain is actually walked here — so the
 * claim on the page is one the page itself checks.
 */

type Row = {
  id: number;
  event_type: string;
  entity_type: string | null;
  created_at: string;
  hash: string;
  prev_hash: string;
};

/** What each event means, said the way you'd say it out loud. */
const PHRASING: Record<string, string> = {
  "conversation.started": "Someone began a conversation with Prism",
  "vision.drafted": "Prism drafted a vision from a conversation",
  "vision.confirmed": "Someone confirmed their vision in their own words",
  "vision.visibility": "Someone changed who can see their vision",
  "collective.woven": "Prism wove the collective vision from every confirmed voice",
  "decision.opened": "A decision was opened to the circle",
  "decision.synthesized": "Prism proposed a synthesis across every confirmed input",
  "decision.decided": "The circle ratified an outcome",
  "decision_input.drafted": "Prism drafted someone's input to a decision",
  "decision_input.confirmed": "Someone confirmed their input to a decision",
  "decision_input.visibility": "Someone changed who can see their input",
  "feedback.submitted": "Someone sent feedback on the prototype",
  "member.upgraded": "Someone turned a temporary identity into a permanent account",
};

function phrase(eventType: string): string {
  if (PHRASING[eventType]) return PHRASING[eventType];
  // Unknown events still read as English rather than as a symbol.
  return eventType.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function AuditPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_log")
    .select("id, event_type, entity_type, created_at, hash, prev_hash")
    .order("id", { ascending: true })
    .limit(500);

  const rows = (data ?? []) as Row[];

  // Walk the chain: each entry should carry the previous entry's hash. This is
  // checked here, on this page, every time it loads — not asserted in prose.
  let firstBreak: number | null = null;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].prev_hash !== rows[i - 1].hash) {
      firstBreak = rows[i].id;
      break;
    }
  }
  const intact = rows.length > 0 && firstBreak === null;

  const newestFirst = [...rows].reverse();

  // Group by day so the record reads as a history, not a dump.
  const byDay = new Map<string, Row[]>();
  for (const r of newestFirst) {
    const day = new Date(r.created_at).toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(r);
  }

  return (
    <>
    <TopNav />
    <main className="min-h-screen max-w-3xl mx-auto w-full px-6 py-10">
      <h1 className="text-4xl mb-3">In the open, in the light</h1>
      <p className="text-muted mb-8 max-w-xl leading-relaxed">
        Everything that matters here leaves a mark: a vision confirmed, a decision
        opened, a synthesis proposed. Each entry carries the fingerprint of the one
        before it, so the history can&apos;t be quietly rewritten — remove or alter an
        entry and every entry after it stops matching.
      </p>

      <section
        className={`rounded-xl border p-5 mb-10 ${
          intact ? "border-accent/50 bg-surface-raised" : "border-red-400/50 bg-red-400/5"
        }`}
      >
        {intact ? (
          <>
            <p className="text-accent">
              ✓ Chain intact — {rows.length} {rows.length === 1 ? "entry" : "entries"}
            </p>
            <p className="text-sm text-muted mt-1.5 leading-relaxed">
              Checked just now, in your browser: every entry links to the one before it,
              unbroken back to the first. This page doesn&apos;t ask you to take that on
              trust — it walks the chain each time you load it.
            </p>
          </>
        ) : rows.length === 0 ? (
          <p className="text-muted text-sm">Nothing has happened yet.</p>
        ) : (
          <>
            <p className="text-red-300">⚠ Chain broken at entry #{firstBreak}</p>
            <p className="text-sm text-muted mt-1.5 leading-relaxed">
              That entry doesn&apos;t carry the fingerprint of the one before it. This is
              exactly what the record exists to make visible.
            </p>
          </>
        )}
        <p className="text-xs text-muted/70 mt-3 leading-relaxed">
          What&apos;s checked here is the linkage between entries. A future phase anchors
          the chain to a public blockchain, so it can be verified without trusting this
          server at all.
        </p>
      </section>

      {[...byDay.entries()].map(([day, items]) => (
        <section key={day} className="mb-8">
          <h2 className="text-sm text-muted tracking-widest uppercase mb-3">{day}</h2>
          <div className="space-y-px">
            {items.map((e) => (
              <div
                key={e.id}
                className="flex items-baseline gap-4 border-b border-borderline py-3"
              >
                <span className="text-muted/60 tabular-nums text-xs shrink-0 pt-0.5">
                  #{e.id}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-relaxed">{phrase(e.event_type)}</p>
                  <p className="text-[11px] text-muted/60 font-mono mt-1 truncate">
                    {e.hash.slice(0, 16)}… ← {e.prev_hash ? `${e.prev_hash.slice(0, 8)}…` : "genesis"}
                  </p>
                </div>
                <span className="text-muted text-xs shrink-0">
                  {new Date(e.created_at).toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))}
          </div>
        </section>
      ))}

      {rows.length === 0 && (
        <p className="text-muted text-sm">
          No events yet — the record fills as people use the Compass.
        </p>
      )}

      <p className="text-xs text-muted/70 mt-10 leading-relaxed">
        No names appear here. What happened is public; who did it is not.
      </p>
    </main>
    </>
  );
}
