import Link from "next/link";
import type { ThreadEcho } from "@/lib/threads";

/**
 * Values -> Action, thin slice: where your confirmed vision meets the circle,
 * and one concrete thing you could do next.
 *
 * Honesty rule: the thread matches are word-level echoes between your own
 * confirmed words and the weave. They are shown WITH the matching words so you
 * can dismiss a bad match at a glance. Prism is not claiming to know you.
 */

export type OpenDecision = { id: string; title: string };

export function WhereYouMeet({
  threads,
  openDecisions,
}: {
  threads: ThreadEcho[];
  openDecisions: OpenDecision[];
}) {
  if (threads.length === 0 && openDecisions.length === 0) return null;

  return (
    <section className="rounded-xl border border-borderline bg-surface p-6 space-y-6">
      <div>
        <h2 className="text-xl mb-1">Where your vision meets the circle</h2>
        <p className="text-sm text-muted leading-relaxed">
          What you described on your own turns out not to be only yours.
        </p>
      </div>

      {threads.length > 0 && (
        <div className="space-y-3">
          {threads.map((t, i) => (
            <div key={i} className="rounded-lg border border-borderline bg-surface-raised p-4">
              <p className="leading-relaxed">{t.thread}</p>
              {t.inTheirWords && (
                <p className="text-sm text-muted italic mt-2 leading-relaxed">
                  “{t.inTheirWords}”
                </p>
              )}
              <p className="text-xs text-muted/70 mt-3">
                {t.voices > 0 && (
                  <>
                    carried by {t.voices} voice{t.voices === 1 ? "" : "s"} ·{" "}
                  </>
                )}
                echoes your words: {t.echoes.join(", ")}
              </p>
            </div>
          ))}
          <p className="text-xs text-muted/70 leading-relaxed">
            These are word-level echoes between your confirmed vision and the collective
            weave — not a claim about what you believe. If one doesn&apos;t fit, it
            doesn&apos;t fit.
          </p>
        </div>
      )}

      {openDecisions.length > 0 && (
        <div>
          <span className="block text-sm text-gold tracking-widest uppercase mb-2">
            What you could do now
          </span>
          <ul className="space-y-2">
            {openDecisions.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/decisions/${d.id}`}
                  className="block rounded-lg border border-borderline bg-surface-raised p-4
                             hover:border-gold transition-colors"
                >
                  <span className="block">{d.title}</span>
                  <span className="block text-sm text-muted mt-0.5">
                    Still gathering perspectives — yours isn&apos;t in it yet.
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
