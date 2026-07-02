import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PrismMark } from "@/components/PrismMark";

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: profile }, { data: vision }, { data: decisions }, { data: convos }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user!.id).single(),
      supabase.from("vision_profiles").select("status").eq("user_id", user!.id).maybeSingle(),
      supabase.from("decisions").select("id, title, status").order("created_at", { ascending: false }),
      supabase.from("conversations").select("id, kind, status")
        .eq("user_id", user!.id).eq("kind", "onboarding").eq("status", "active")
        .order("created_at", { ascending: false }).limit(1),
    ]);

  const activeOnboarding = convos?.[0];

  return (
    <main className="min-h-screen horizon px-6 py-8 max-w-3xl mx-auto w-full">
      <header className="flex items-center justify-between mb-12">
        <div className="flex items-center gap-3">
          <PrismMark />
          <span className="text-sm tracking-[0.2em] uppercase text-muted">The Compass</span>
        </div>
        <span className="text-sm text-muted">{profile?.display_name}</span>
      </header>

      <h1 className="text-4xl mb-2">Welcome, {profile?.display_name}</h1>
      <p className="text-muted mb-10">
        {vision?.status === "confirmed"
          ? "Your vision is part of the collective map."
          : "The journey begins with your vision."}
      </p>

      <div className="grid gap-4">
        <Card
          href={activeOnboarding ? `/chat/${activeOnboarding.id}` : "/journey"}
          title={
            vision?.status === "confirmed"
              ? "Revisit your vision conversation"
              : activeOnboarding
                ? "Continue your conversation with Prism"
                : "Begin: describe your ideal life"
          }
          sub="The Global Values Survey — dream big, completely unbounded."
        />
        {vision?.status === "draft" && (
          <Card
            href="/vision"
            title="Review & confirm your vision draft"
            sub="Prism drafted it; only you can make it true."
            highlight
          />
        )}
        <Card
          href="/decisions"
          title="Circle decisions"
          sub={`${decisions?.length ?? 0} decision${(decisions?.length ?? 0) === 1 ? "" : "s"} in process — the all-win pilot.`}
        />
        <Card
          href="/audit"
          title="The open record"
          sub="Every significant event, hash-chained and tamper-evident."
        />
      </div>
    </main>
  );
}

function Card({ href, title, sub, highlight }: {
  href: string; title: string; sub: string; highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`block rounded-xl border p-6 transition-all hover:border-gold
        ${highlight ? "border-gold bg-surface-raised gold-glow" : "border-borderline bg-surface"}`}
    >
      <h2 className="text-xl mb-1">{title}</h2>
      <p className="text-sm text-muted">{sub}</p>
    </Link>
  );
}
