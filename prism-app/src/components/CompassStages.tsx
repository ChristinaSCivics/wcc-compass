/**
 * The Compass deliberation spine, made visible.
 *
 * The Compass process is defined as: perspectives -> values and needs ->
 * actual agreement -> semantic disagreement -> tensions and red lines ->
 * possible pathways -> synthesis -> human review -> refinement -> shared
 * direction. The app already runs this; it just ran it invisibly, which made
 * a deliberate process look like a black box between "submit" and "answer."
 *
 * Stages map onto decisions.status: gathering | synthesis | review | decided.
 */

const STAGES = [
  {
    key: "gathering",
    name: "Perspectives",
    detail:
      "Each person is interviewed on their own — what they need and why, what their key words mean to them, their real constraints, and their red lines. Nobody hears anyone else's answers yet, so no one anchors on the loudest voice.",
  },
  {
    key: "synthesis",
    name: "Synthesis",
    detail:
      "Prism reads across every confirmed voice at once, looking for shared ground, words being used two different ways, tensions that are genuinely real, and pathways that could meet everyone's underlying needs.",
  },
  {
    key: "review",
    name: "Human review",
    detail:
      "The circle reads the synthesis against their own words and refines it. This is a proposal, not a verdict — it can be sent back, and disagreement here is the process working.",
  },
  {
    key: "decided",
    name: "Shared direction",
    detail:
      "What the circle ratified, with the reasoning that got them there, written to the open record.",
  },
] as const;

export function CompassStages({ status }: { status: string }) {
  const current = Math.max(
    0,
    STAGES.findIndex((s) => s.key === status)
  );

  return (
    <section className="rounded-xl border border-borderline bg-surface p-6 mb-8">
      <div className="flex items-baseline justify-between gap-3 mb-4 flex-wrap">
        <h2 className="text-lg">How this decision moves</h2>
        <span className="text-[10px] text-muted tracking-[0.2em] uppercase">
          The Compass process
        </span>
      </div>

      <ol className="flex flex-col sm:flex-row sm:items-stretch gap-2 sm:gap-1 mb-5">
        {STAGES.map((s, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={s.key} className="flex-1 min-w-0">
              <div
                className={`h-0.5 w-full rounded-full mb-2 transition-colors ${
                  done ? "bg-accent/50" : active ? "bg-accent" : "bg-borderline"
                }`}
              />
              <span
                className={`block text-xs tracking-wider uppercase truncate ${
                  active ? "text-accent" : done ? "text-muted" : "text-muted/50"
                }`}
              >
                {done ? "✓ " : ""}
                {s.name}
              </span>
            </li>
          );
        })}
      </ol>

      <p className="text-sm text-muted leading-relaxed">
        <span className="text-accent">Now: {STAGES[current].name}.</span>{" "}
        {STAGES[current].detail}
      </p>
    </section>
  );
}
