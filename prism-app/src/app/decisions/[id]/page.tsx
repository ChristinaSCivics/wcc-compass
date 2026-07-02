import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PrismMark } from "@/components/PrismMark";
import { DecisionActions } from "./DecisionActions";
import { SynthesisView } from "./SynthesisView";

export default async function DecisionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: decision }, { data: profile }, { data: inputs }, { data: myInput }, { data: myConvo }] =
    await Promise.all([
      supabase.from("decisions").select("*").eq("id", id).single(),
      supabase.from("profiles").select("role").eq("id", user!.id).single(),
      supabase
        .from("decision_inputs")
        .select("user_id, confirmed, needs, profiles(display_name)")
        .eq("decision_id", id)
        .eq("confirmed", true),
      supabase
        .from("decision_inputs")
        .select("confirmed")
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
    ]);

  if (!decision) notFound();
  const isFacilitator = ["facilitator", "admin"].includes(profile?.role ?? "");

  return (
    <main className="min-h-screen max-w-3xl mx-auto w-full px-6 py-8">
      <header className="flex items-center gap-3 mb-10">
        <Link href="/decisions"><PrismMark /></Link>
        <span className="text-sm text-muted">← All decisions</span>
      </header>

      <span className="text-xs text-gold tracking-widest uppercase">{decision.status}</span>
      <h1 className="text-4xl mt-2 mb-4">{decision.title}</h1>
      {decision.description && (
        <p className="text-muted leading-relaxed mb-8">{decision.description}</p>
      )}

      <section className="rounded-xl border border-borderline bg-surface p-6 mb-8">
        <h2 className="text-lg mb-3">Voices gathered</h2>
        {inputs?.length ? (
          <ul className="text-sm text-muted space-y-1">
            {inputs.map((i) => {
              const p = i.profiles as unknown as { display_name: string } | null;
              return <li key={i.user_id}>◈ {p?.display_name ?? "member"} — confirmed</li>;
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted">No confirmed inputs yet.</p>
        )}
      </section>

      <DecisionActions
        decisionId={decision.id}
        decisionStatus={decision.status}
        isFacilitator={isFacilitator}
        hasConfirmedInput={!!myInput?.confirmed}
        activeConversationId={myConvo?.[0]?.status === "active" ? myConvo[0].id : null}
        confirmedInputCount={inputs?.length ?? 0}
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
  );
}
