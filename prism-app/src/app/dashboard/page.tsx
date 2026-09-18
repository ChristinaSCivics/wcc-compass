import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TopNav } from "@/components/TopNav";
import { SaveSpot } from "@/components/SaveSpot";
import { DemoBadge } from "@/components/DemoBadge";
import { WccMark } from "@/components/WccLogo";
import { MastermindSignup } from "@/components/MastermindSignup";
import { mastermindDate } from "@/lib/mastermind";
import { YourPiece } from "@/components/YourPiece";
import { WhereYouMeet } from "@/components/WhereYouMeet";
import { echoedThreads, type CoreValue, type Weave } from "@/lib/threads";
import { scrubNames } from "@/lib/anonymize";

export default async function Dashboard() {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [
    { data: profile },
    { data: vision },
    { data: decisions },
    { data: convos },
    { data: weaveRows },
    { data: myInputs },
    { data: roster },
    { data: signup },
  ] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user!.id).single(),
      supabase.from("vision_profiles").select("status, confirmed").eq("user_id", user!.id).maybeSingle(),
      supabase.from("decisions").select("id, title, status").order("created_at", { ascending: false }),
      supabase.from("conversations").select("id, kind, status")
        .eq("user_id", user!.id).eq("kind", "onboarding").eq("status", "active")
        .order("created_at", { ascending: false }).limit(1),
      supabase.from("collective_syntheses").select("content")
        .order("created_at", { ascending: false }).limit(1),
      supabase.from("decision_inputs").select("decision_id, confirmed").eq("user_id", user!.id),
      // Names, used only to scrub them back out of the weave before display.
      admin.from("profiles").select("display_name"),
      // Has this person already asked for the call? RLS blocks client reads of
      // the signup list, so this goes through the admin client.
      admin
        .from("mastermind_signups")
        .select("id")
        .eq("user_id", user!.id)
        .maybeSingle(),
    ]);

  const activeOnboarding = convos?.[0];

  // Values -> Action, thin slice. Only meaningful once they have confirmed words
  // of their own to match against.
  const confirmedVision =
    vision?.status === "confirmed"
      ? (vision.confirmed as Record<string, unknown> | null)
      : null;
  const rawValues = confirmedVision?.core_values;
  const threads = confirmedVision
    ? echoedThreads(
        (Array.isArray(rawValues) ? rawValues : []) as CoreValue[],
        scrubNames(
          (weaveRows?.[0]?.content ?? null) as Weave | null,
          (roster ?? []).map((p) => p.display_name as string | null)
        )
      )
    : [];
  const answered = new Set(
    (myInputs ?? []).filter((i) => i.confirmed).map((i) => i.decision_id)
  );
  const openForYou = (decisions ?? [])
    .filter((d) => d.status === "gathering" && !answered.has(d.id))
    .slice(0, 3);

  // One next step, chosen by where they actually are. Everything else on this
  // page used to be a same-sized card in the same stack, so nothing read as
  // more important than anything else — including the only thing most people
  // arrive needing to do.
  const primary =
    vision?.status === "draft"
      ? {
          href: "/vision",
          eyebrow: "Waiting on you",
          title: "Review and confirm your vision",
          sub: "Prism drafted it from your conversation. Only you can make it true — edit anything, then confirm.",
          cta: "Review the draft",
        }
      : vision?.status === "confirmed"
        ? {
            href: "/collective",
            eyebrow: "Your vision is on the map",
            title: "See what everyone is reaching for",
            sub: "Prism weaves every confirmed vision into one picture — the threads we share, and the many ways we want to live.",
            cta: "Open the collective vision",
          }
        : {
            href: activeOnboarding ? `/chat/${activeOnboarding.id}` : "/journey",
            eyebrow: activeOnboarding ? "Picked up where you left off" : "Start here",
            title: activeOnboarding
              ? "Continue your conversation with Prism"
              : "Describe the life you'd actually want",
            sub: "Dream big — completely unbounded. A few minutes, and you can stop whenever you like.",
            cta: activeOnboarding ? "Continue" : "Begin",
          };

  return (
    <>
    <TopNav />
    <main className="min-h-screen horizon px-6 py-10 max-w-3xl mx-auto w-full">
      <header className="flex items-start gap-4 mb-8">
        <WccMark size={44} className="shrink-0 mt-1 hidden sm:block" />
        <div>
          <DemoBadge />
          <h1 className="text-4xl mt-2">Welcome, {profile?.display_name}</h1>
          <p className="text-muted mt-1">
            {vision?.status === "confirmed"
              ? "Your vision is part of the collective map."
              : vision?.status === "draft"
                ? "One step left — your draft is waiting."
                : "It begins with your vision."}
          </p>
        </div>
      </header>

      {/* ---- the one thing to do next ---- */}
      <Link
        href={primary.href}
        className="block rounded-2xl border border-accent bg-surface-raised p-7 accent-glow
                   transition-all hover:bg-surface"
      >
        <span className="block text-[10px] text-accent tracking-[0.18em] uppercase mb-2">
          {primary.eyebrow}
        </span>
        <h2 className="text-2xl mb-2">{primary.title}</h2>
        <p className="text-sm text-muted leading-relaxed max-w-xl">{primary.sub}</p>
        <span className="inline-block mt-5 text-sm text-accent">{primary.cta} →</span>
      </Link>

      {/* ---- what's yours ---- */}
      {(confirmedVision || vision?.status === "confirmed") && (
        <div className="grid gap-4 mt-6">
          {confirmedVision && <YourPiece vision={confirmedVision} compact />}
          {confirmedVision && (threads.length > 0 || openForYou.length > 0) && (
            <WhereYouMeet threads={threads} openDecisions={openForYou} />
          )}
        </div>
      )}

      {/* The exit action shouldn't live three pages deep — anyone who hasn't
          asked for the call yet can do it from here. */}
      {!signup && (
        <div className="mt-6">
          <MastermindSignup when={mastermindDate()} compact />
        </div>
      )}

      {user!.is_anonymous && <div className="mt-6"><SaveSpot /></div>}

      {/* ---- everything else, deliberately quiet ---- */}
      <nav className="mt-12 pt-6 border-t border-borderline">
        <span className="block text-[10px] text-muted tracking-[0.18em] uppercase mb-4">
          Elsewhere
        </span>
        <div className="grid gap-3 sm:grid-cols-3">
          {vision?.status === "confirmed" && (
            <Tile href="/vision" title="Your vision" sub="Read, refine, re-confirm" />
          )}
          {vision?.status !== "confirmed" && (
            <Tile href="/collective" title="The collective" sub="Every confirmed voice, woven" />
          )}
          <Tile
            href="/decisions"
            title="Decisions"
            sub={`${decisions?.length ?? 0} in process`}
          />
          <Tile href="/audit" title="The open record" sub="Tamper-evident, readable by all" />
        </div>
      </nav>
    </main>
    </>
  );
}

function Tile({ href, title, sub }: { href: string; title: string; sub: string }) {
  return (
    <Link
      href={href}
      className="block rounded-xl border border-borderline bg-surface/60 px-4 py-3
                 transition-colors hover:border-accent"
    >
      <span className="block text-sm">{title}</span>
      <span className="block text-xs text-muted mt-0.5">{sub}</span>
    </Link>
  );
}
