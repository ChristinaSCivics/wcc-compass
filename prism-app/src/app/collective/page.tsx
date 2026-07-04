/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TopNav } from "@/components/TopNav";
import { WeaveButton } from "./WeaveButton";

/** The collective map: who's on it, and Prism's latest weaving of all confirmed visions. */
export default async function CollectivePage() {
  const supabase = await createClient();

  const [{ data: visions }, { data: weaves }] = await Promise.all([
    supabase
      .from("vision_profiles")
      .select("confirmed, confirmed_at, profiles(display_name)")
      .eq("status", "confirmed")
      .order("confirmed_at", { ascending: true }),
    supabase
      .from("collective_syntheses")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  const weave = weaves?.[0];
  const c = (weave?.content ?? null) as any;

  return (
    <>
    <TopNav />
    <main className="min-h-screen max-w-3xl mx-auto w-full px-6 py-10 horizon">
      <h1 className="text-4xl mb-3">The collective vision</h1>
      <p className="text-muted mb-8 max-w-xl leading-relaxed">
        Every confirmed vision joins the map. Prism weaves them — finding the threads we
        share and honoring the many ways we want to live. Not one vision for everyone;
        a world with room for all of ours.
      </p>

      <section className="rounded-xl border border-borderline bg-surface p-6 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg">
              {visions?.length ?? 0} {(visions?.length ?? 0) === 1 ? "voice" : "voices"} on the map
            </h2>
            <p className="text-sm text-muted mt-1">
              {(visions ?? [])
                .map((v) => (v.profiles as unknown as { display_name: string } | null)?.display_name ?? "member")
                .join(" · ") || "Be the first —"}
              {!visions?.length && (
                <Link href="/journey" className="text-gold ml-1">share your vision</Link>
              )}
            </p>
          </div>
          <WeaveButton hasVisions={(visions?.length ?? 0) > 0} />
        </div>
      </section>

      {!weave && (
        <p className="text-sm text-muted">
          No weaving yet. Once visions are on the map, a keeper asks Prism to weave them —
          and the collective picture appears here, in the open.
        </p>
      )}

      {c && (
        <div className="space-y-6 fade-up">
          <section className="rounded-xl border border-gold bg-surface-raised p-8 gold-glow">
            <p className="text-xs text-gold tracking-widest uppercase mb-3">
              Woven from {weave.member_count} {weave.member_count === 1 ? "voice" : "voices"} ·{" "}
              {new Date(weave.created_at).toLocaleDateString()}
            </p>
            <p className="text-xl leading-relaxed serif">{c.summary}</p>
          </section>

          {!!c.shared_threads?.length && (
            <Block title="Threads we share">
              {c.shared_threads.map((t: any, i: number) => (
                <div key={i} className="mb-4 last:mb-0">
                  <p className="text-gold">{t.thread}</p>
                  <p className="text-sm text-muted italic mt-1">&ldquo;{t.in_their_words}&rdquo;</p>
                  <p className="text-xs text-muted mt-1">— {t.carried_by?.join(", ")}</p>
                </div>
              ))}
            </Block>
          )}

          {!!c.values_in_common?.length && (
            <Block title="Values in common">
              <div className="flex flex-wrap gap-2">
                {c.values_in_common.map((v: string, i: number) => (
                  <span key={i} className="text-sm border border-borderline rounded-full px-3 py-1 text-foreground">
                    {v}
                  </span>
                ))}
              </div>
            </Block>
          )}

          {!!c.many_ways?.length && (
            <Block title="The many ways we want to live">
              {c.many_ways.map((w: any, i: number) => (
                <div key={i} className="mb-3 last:mb-0">
                  <p><span className="text-gold">{w.whose}:</span> {w.way}</p>
                  <p className="text-sm text-muted mt-0.5">{w.essence}</p>
                </div>
              ))}
            </Block>
          )}

          {!!c.creative_tensions?.length && (
            <Block title="Creative tensions — held, not hidden">
              {c.creative_tensions.map((t: any, i: number) => (
                <div key={i} className="mb-3 last:mb-0 text-sm">
                  <p className="text-foreground">{t.between}</p>
                  <p className="text-muted mt-0.5">{t.why_it_is_healthy}</p>
                </div>
              ))}
            </Block>
          )}

          {!!c.emerging_questions?.length && (
            <Block title="Questions this raises">
              <ul className="space-y-2 text-sm">
                {c.emerging_questions.map((q: string, i: number) => (
                  <li key={i} className="flex gap-2"><span className="text-gold">◈</span>{q}</li>
                ))}
              </ul>
            </Block>
          )}

          {!!c.honest_notes?.length && (
            <Block title="Prism's honest notes">
              <ul className="space-y-1 text-sm text-muted">
                {c.honest_notes.map((n: string, i: number) => <li key={i}>{n}</li>)}
              </ul>
            </Block>
          )}
        </div>
      )}
    </main>
    </>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-borderline bg-surface p-6">
      <h3 className="text-lg mb-4">{title}</h3>
      {children}
    </section>
  );
}
