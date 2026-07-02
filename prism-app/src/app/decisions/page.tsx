import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PrismMark } from "@/components/PrismMark";
import { NewDecisionForm } from "./NewDecisionForm";

const STATUS_LABEL: Record<string, string> = {
  gathering: "Gathering voices",
  synthesis: "Prism synthesizing",
  review: "Reviewing together",
  decided: "Decided",
};

export default async function DecisionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: profile }, { data: decisions }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user!.id).single(),
    supabase.from("decisions").select("*").order("created_at", { ascending: false }),
  ]);

  const isFacilitator = ["facilitator", "admin"].includes(profile?.role ?? "");

  return (
    <main className="min-h-screen max-w-3xl mx-auto w-full px-6 py-8 horizon">
      <header className="flex items-center gap-3 mb-10">
        <Link href="/dashboard"><PrismMark /></Link>
        <span className="text-sm text-muted">Circle decisions</span>
      </header>

      <h1 className="text-4xl mb-2">Deciding together</h1>
      <p className="text-muted mb-10 max-w-xl leading-relaxed">
        Real decisions, facilitated by Prism toward all-win outcomes. Prism interviews
        each of us, maps where conflict is real and where it&apos;s only words, and
        proposes options — then <em>we</em> decide, in the open.
      </p>

      {isFacilitator && <NewDecisionForm />}

      <div className="grid gap-4 mt-8">
        {(decisions ?? []).map((d) => (
          <Link
            key={d.id}
            href={`/decisions/${d.id}`}
            className="block rounded-xl border border-borderline bg-surface p-6 hover:border-gold transition-all"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl">{d.title}</h2>
              <span className="text-xs text-gold tracking-widest uppercase">
                {STATUS_LABEL[d.status] ?? d.status}
              </span>
            </div>
            {d.description && (
              <p className="text-sm text-muted mt-2 line-clamp-2">{d.description}</p>
            )}
          </Link>
        ))}
        {!decisions?.length && (
          <p className="text-muted text-sm">
            No decisions open yet{isFacilitator ? " — open the first one above." : "."}
          </p>
        )}
      </div>
    </main>
  );
}
