/* eslint-disable @typescript-eslint/no-explicit-any */

/** Renders Prism's synthesis for group review. Prism proposes; the group decides. */
export function SynthesisView({ synthesis }: { synthesis: any }) {
  return (
    <section className="space-y-6 mt-4">
      <h2 className="text-2xl">Prism&apos;s synthesis</h2>
      <p className="text-sm text-muted -mt-4">
        A proposal, not a verdict. Check it against your own words.
      </p>

      {!!synthesis.shared_ground?.length && (
        <Block title="Shared ground">
          <ul className="list-disc list-inside space-y-1 text-sm">
            {synthesis.shared_ground.map((s: string, i: number) => <li key={i}>{s}</li>)}
          </ul>
        </Block>
      )}

      {!!synthesis.term_alignments?.length && (
        <Block title="Words we're using differently">
          {synthesis.term_alignments.map((t: any, i: number) => (
            <div key={i} className="text-sm mb-2">
              <span className="text-gold">{t.term}</span>
              <span className="text-muted"> — {t.definitions_in_play?.join(" · ")}</span>
              {t.is_conflict_terminological && (
                <span className="text-muted italic"> (likely a language conflict, not a real one)</span>
              )}
            </div>
          ))}
        </Block>
      )}

      {!!synthesis.genuine_conflicts?.length && (
        <Block title="Genuine conflicts — named honestly">
          {synthesis.genuine_conflicts.map((c: any, i: number) => (
            <div key={i} className="text-sm mb-3">
              <p className="text-gold">{c.between?.join(" ↔ ")}</p>
              <p className="text-muted">{c.why_it_is_real}</p>
            </div>
          ))}
        </Block>
      )}

      {!!synthesis.options?.length && (
        <div className="space-y-4">
          <h3 className="text-lg">Candidate options</h3>
          {synthesis.options.map((o: any, i: number) => (
            <div key={i} className="rounded-xl border border-borderline bg-surface p-6">
              <h4 className="text-xl mb-2">{o.title}</h4>
              <p className="text-sm text-muted mb-4">{o.description}</p>
              {o.how_it_meets_each_person?.map((p: any, j: number) => (
                <p key={j} className="text-sm mb-1">
                  <span className="text-gold">{p.name}:</span>{" "}
                  {p.needs_met?.length ? `meets ${p.needs_met.join(", ")}` : "—"}
                  {p.needs_unmet?.length ? (
                    <span className="text-muted"> · unmet: {p.needs_unmet.join(", ")}</span>
                  ) : null}
                </p>
              ))}
              {!!o.red_lines_crossed?.length && (
                <p className="text-sm text-red-400 mt-3">
                  ⚠ Crosses red lines: {o.red_lines_crossed.map((r: any) => `${r.name} (${r.red_line})`).join("; ")}
                </p>
              )}
              <p className="text-sm mt-3">
                <span className="text-gold">Golden-rule check — who is harmed:</span>{" "}
                <span className={o.who_is_harmed === "none identified" ? "text-muted" : "text-red-400"}>
                  {o.who_is_harmed}
                </span>
              </p>
            </div>
          ))}
        </div>
      )}

      {!!synthesis.honest_notes?.length && (
        <Block title="Prism's honest notes">
          <ul className="list-disc list-inside space-y-1 text-sm text-muted">
            {synthesis.honest_notes.map((n: string, i: number) => <li key={i}>{n}</li>)}
          </ul>
        </Block>
      )}
    </section>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-borderline bg-surface p-6">
      <h3 className="text-lg mb-3">{title}</h3>
      {children}
    </div>
  );
}
