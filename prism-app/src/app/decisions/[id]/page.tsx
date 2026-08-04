import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TopNav } from "@/components/TopNav";
import { DecisionActions } from "./DecisionActions";
import { SynthesisView } from "./SynthesisView";

export default async function DecisionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: decision }, { data: inputs }, { data: myInput }, { data: myConvo }, { count: totalInputCount }] =
    await Promise.all([
      supabase.from("decisions").select("*").eq("id", id).single(),
      // RLS-gated: only returns other stakeholders' inputs once the viewer has
      // confirmed their own, and excludes anyone who's chosen to hide theirs.
      // Sandbox identities (is_test) are never counted among the voices.
      supabase
        .from("decision_inputs")
        .select("user_id, confirmed, needs, profiles!inner(display_name, is_test)")
        .eq("decision_id", id)
        .eq("confirmed", true)
        .eq("profiles.is_test", false),
      supabase
        .from("decision_inputs")
        .select("confirmed, hidden")
        .eq("decision_id", id)
        .eq("user_id", user!.id)
        .maybeSingle(),
      supabase
        .from("conversations")
        .select("id, status")
        .eq("decision_id", id)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1),
      // Bypasses RLS, but only ever returns a count — never leaks who's hidden.
      admin
        .from("decision_inputs")
        .select("id, profiles!inner(is_test)", { count: "exact", head: true })
        .eq("decision_id", id)
        .eq("confirmed", true)
        .eq("profiles.is_test", false),
    ]);

  if (!decision) notFound();

  return (
    <>
    <TopNav />
    <main className="min-h-screen max-w-3xl mx-auto w-full px-6 py-10">
      <Link href="/decisions" className="text-sm text-muted hover:text-gold transition-colors">
        ← All decisions
      </Link>

      <div className="mt-6" />
      <span className="text-xs text-gold tracking-widest uppercase">{decision.status}</span>
      <h1 className="text-4xl mt-2 mb-4">{decision.title}</h1>
      {decision.description && (
        <p className="text-muted leading-relaxed mb-8">{decision.description}</p>
      )}

      <section className="rounded-xl border border-borderline bg-surface p-6 mb-8">
        <h2 className="text-lg mb-3">
          Voices gathered
          <span className="text-sm text-muted font-normal ml-2">
            ({totalInputCount ?? 0} confirmed)
          </span>
        </h2>
        {!myInput?.confirmed ? (
          <p className="text-sm text-muted">
            Submit your input to see who else has confirmed theirs.
          </p>
        ) : inputs?.length ? (
          <ul className="text-sm text-muted space-y-1">
            {inputs.map((i) => {
              const p = i.profiles as unknown as { display_name: string } | null;
              return <li key={i.user_id}>◈ {p?.display_name ?? "member"} — confirmed</li>;
            })}
          </ul>
        ) : (totalInputCount ?? 0) > 0 ? (
          <p className="text-sm text-muted">
            Others have confirmed, but have chosen to keep their names private.
          </p>
        ) : (
          <p className="text-sm text-muted">No confirmed inputs yet.</p>
        )}
      </section>

      <DecisionActions
        decisionId={decision.id}
        decisionStatus={decision.status}
        hasSynthesis={decision.synthesis != null}
        hasConfirmedInput={!!myInput?.confirmed}
        hidden={!!myInput?.hidden}
        activeConversationId={myConvo?.[0]?.status === "active" ? myConvo[0].id : null}
        confirmedInputCount={totalInputCount ?? 0}
      />

      {decision.synthesis != null && <SynthesisView synthesis={decision.synthesis} />}

      {decision.outcome != null && (
        <section className="rounded-xl border border-gold bg-surface-raised p-6 mt-8 gold-glow">
          <h2 className="text-lg mb-2 text-gold">Ratified outcome</h2>
          <p className="mb-2">{(decision.outcome as { chosen_option?: string }).chosen_option}</p>
          <p className="text-sm text-muted">
            {(decision.outcome as { rationale?: string }).rationale}
          </p>
        </section>
      )}
    </main>
    </>
  );
}
