import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WccMark } from "@/components/WccLogo";
import { YourPiece, yourPieceIsEmpty } from "@/components/YourPiece";
import { MastermindSignup } from "@/components/MastermindSignup";
import { mastermindDate } from "@/lib/mastermind";

/**
 * The closing — what a conversation ends in, instead of a save.
 *
 * Three things, in this order: reflect back what was heard, name what's
 * coming, then invite the person in. Ending on "your vision has been saved"
 * loses the person at exactly the moment they're most willing to stay.
 */
export default async function NextSteps() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: vision } = await supabase
    .from("vision_profiles")
    .select("confirmed, status")
    .eq("user_id", user.id)
    .maybeSingle();

  // Reached without a confirmed vision? There's nothing to close on.
  if (vision?.status !== "confirmed") redirect("/dashboard");

  const confirmed = (vision.confirmed ?? {}) as Record<string, unknown>;
  const headline = typeof confirmed.headline === "string" ? confirmed.headline : null;
  const when = mastermindDate();

  return (
    <main className="min-h-screen horizon px-6 py-14 max-w-2xl mx-auto w-full fade-up">
      <WccMark size={48} />

      {/* 1 — reflect back */}
      <h1 className="mt-7 text-3xl sm:text-4xl leading-tight">
        That&apos;s a clear picture — and it&apos;s now part of something larger.
      </h1>
      {headline && (
        <blockquote className="mt-6 border-l-2 border-accent pl-5 text-lg leading-relaxed serif">
          {headline}
        </blockquote>
      )}
      <p className="mt-5 text-muted leading-relaxed">
        Those are your words, confirmed by you. Nobody else&apos;s name is attached to them
        on the shared map, and nothing here was recorded until you said it was true.
      </p>

      {/* 2 — name what's coming */}
      <section className="mt-12">
        <h2 className="text-sm text-accent tracking-widest uppercase mb-4">
          Where this is going
        </h2>
        <ul className="space-y-4">
          <Item>
            A short film of the world you just described — yours to keep, and to show
            the people around you.
          </Item>
          <Item>
            A map of how people actually want to live, built from everyone&apos;s
            confirmed words. It becomes the north star for what we design.
          </Item>
          <Item>
            A national conversation about the world we want, leading to a shared vision
            people can actually build toward.
          </Item>
          <Item>
            Connections to people who want to live the way you want to live — and to
            work happening near you.
          </Item>
          <Item>
            Blueprints: things that already work somewhere, so a community can start
            building instead of starting over.
          </Item>
        </ul>
        <p className="mt-6 text-muted leading-relaxed">
          This isn&apos;t a company with customers. It&apos;s people deciding to design the
          world they want to live in. We aren&apos;t asking permission — we&apos;re going to
          build it.
        </p>
      </section>

      {/* Peter's invitation to Part 2: one prominent button, gold on charcoal. */}
      <section className="mt-12 rounded-2xl bg-[#1A1A1A] px-6 py-8 text-center">
        <p className="text-[#F2EDE4] leading-relaxed">
          There&apos;s one more conversation, if you&apos;d like it. It&apos;s about you, and
          the piece of the puzzle you carry.
        </p>
        <Link
          href="/connect/start"
          className="mt-5 block sm:inline-block w-full sm:w-auto px-8 py-4 rounded-full
                     bg-[#C8A24A] text-[#1A1A1A] text-lg font-[Georgia,serif]
                     transition-all duration-500 hover:-translate-y-0.5
                     hover:shadow-[0_0_28px_rgba(200,162,74,0.45)]
                     focus-visible:-translate-y-0.5 focus-visible:shadow-[0_0_28px_rgba(200,162,74,0.45)]"
        >
          What Piece(s) of the Puzzle Do You Bring?
        </Link>
      </section>

      {/* 3 — invite them in */}
      <section className="mt-12">
        <MastermindSignup when={when} />
      </section>

      {!yourPieceIsEmpty(confirmed) && (
        <section className="mt-8">
          <YourPiece vision={confirmed} />
        </section>
      )}

      <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-3">
        <Link
          href="/collective"
          className="px-7 py-3 bg-accent text-background rounded-full
                     hover:bg-accent-soft transition-all accent-glow"
        >
          See what everyone shares
        </Link>
        <Link href="/dashboard" className="text-sm text-muted hover:text-accent transition-colors">
          Or go to your home →
        </Link>
        <a
          href="https://worldcocreation.com"
          className="text-sm text-accent/80 hover:text-accent transition-colors"
        >
          World Co-Creation ↗
        </a>
      </div>
    </main>
  );
}

function Item({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3 leading-relaxed">
      <span className="text-accent shrink-0">◈</span>
      <span>{children}</span>
    </li>
  );
}
