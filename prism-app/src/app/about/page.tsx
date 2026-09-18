import Link from "next/link";
import { WccLogo, WccMark } from "@/components/WccLogo";
import { TopNav } from "@/components/TopNav";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "What this is — The Compass",
  description:
    "An early tool for finding out how people actually want to live — and what we turn out to share.",
};

export default async function About() {
  // Reachable both from the landing page and from inside the app. Signed in,
  // it used to drop you into a page with no way back to anything.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen horizon">
      {user ? (
        <TopNav />
      ) : (
        <nav className="flex items-center justify-between px-6 sm:px-8 py-5 max-w-3xl mx-auto w-full gap-4">
          <Link href="/"><WccLogo height={24} /></Link>
          <Link href="/login" className="text-sm text-accent hover:text-foreground transition-colors">
            Enter →
          </Link>
        </nav>
      )}

      <article className="max-w-3xl mx-auto w-full px-6 sm:px-8 pb-24">
        <header className="py-10">
          <WccMark size={44} />
          <h1 className="mt-6 text-4xl md:text-5xl leading-tight">
            What this is
          </h1>
          <p className="mt-4 text-muted text-lg leading-relaxed max-w-xl">
            Almost nobody has ever been asked how they&apos;d actually want to live — not
            which party they back, not what they&apos;re against. Just: what would a good
            life look like, if you got to design it?
          </p>
          <p className="mt-4 text-muted leading-relaxed max-w-xl">
            The Compass asks that question, one person at a time, and then looks across all
            the answers for what we turn out to have in common. This is an early version —
            v0.1 — and it works today.
          </p>
        </header>

        <Section title="How it works">
          <Step n="01" title="You talk to Prism">
            Prism is an AI facilitator. It asks about the life you&apos;d want, what&apos;s
            standing in the way, what you&apos;d fix about the world, and what you&apos;d
            want to contribute. It follows what you say rather than working through a form,
            and when you use a big word — freedom, community, enough — it asks what{" "}
            <em>you</em> mean by it. A few minutes is plenty. You can stop at any point.
          </Step>
          <Step n="02" title="You decide what's true">
            Prism writes up what it heard. Then you edit it — rewrite it, cut it, correct
            it. Nothing becomes your vision until you say it is. That is the part most
            systems skip, and it&apos;s the part that matters most.
          </Step>
          <Step n="03" title="Your vision joins the others">
            Prism reads across everyone&apos;s confirmed visions and finds the threads
            running through them — and, just as importantly, the genuinely different ways
            people want to live. The goal is not one vision everybody signs. It&apos;s a
            picture of a world with room for all of them.
          </Step>
          <Step n="04" title="And when there's something to decide">
            The same approach handles disagreement. Everyone is interviewed separately, so
            nobody anchors on the loudest voice. Prism looks for where people actually
            agree, where they&apos;re using one word two different ways, and where the
            conflict is real — then proposes ways forward that meet what everyone
            underneath is actually asking for. People decide. Prism never does.
          </Step>
        </Section>

        <Section title="What happens to what you say">
          <P>
            Your conversation is private to you. Only the version you confirm is visible to
            anyone else — and on the shared pages it appears without your name, described
            by proportion rather than by person: <em>one participant</em>,{" "}
            <em>about a quarter of people here</em>.
          </P>
          <P>
            One honest exception. Early on, some people had a long conversation and never
            reached a draft, because the way out was too easy to miss. Rather than lose
            what they said, a keeper drafted from those conversations and placed them on
            the map on those people&apos;s behalf. Those visions are marked as exactly that
            — on the collective page, and to the person themselves, who is asked to correct
            and confirm it when they return. Nothing drafted on someone&apos;s behalf is
            ever presented as something they approved.
          </P>
          <P>
            Every significant event — a vision confirmed, a decision recorded — is written
            to an open log that any member can read, and that is built so it can&apos;t be
            quietly rewritten after the fact. The code and Prism&apos;s full instructions
            are public, so anyone can check exactly what it was told to do. We&apos;d rather
            be checkable than trusted.
          </P>
        </Section>

        <Section title="What Prism will not do">
          <Ul
            items={[
              "Hold a position. Prism has no view on any party, ideology, religion or way of life, and won't acquire one. Ask it and it'll tell you so.",
              "Sort you. It never labels what you said as left or right, progressive or conservative. Your values are recorded in your words.",
              "Improve you. When it reflects your vision back, it quotes or closely paraphrases. It doesn't tidy up what you meant.",
              "Decide anything. It drafts, suggests and synthesises. A person confirms — always.",
            ]}
          />
          <P>
            The one thing it does hold is the Golden Rule, put to work as a design question
            rather than a sermon: whatever is proposed, who would be harmed by it? People
            wanting to live differently isn&apos;t harm — that&apos;s the whole point. One
            person&apos;s plan requiring harm to another is.
          </P>
        </Section>

        <Section title="Honest about where it is">
          <P>
            This is v0.1. It&apos;s here so you can feel what&apos;s being built rather than
            just hear about it. Some things are real and working right now:
          </P>
          <Ul
            items={[
              "The conversation, the draft you edit, and the confirmed record.",
              "The weave that finds shared threads across everyone's visions.",
              "A real group decision, with the conflicts named honestly rather than smoothed over.",
              "The open, tamper-evident log.",
            ]}
          />
          <P>And some things are coming, but aren&apos;t here yet:</P>
          <Ul
            items={[
              "A short film of your own vision, made from your conversation — yours to keep and to share.",
              "Being connected to people who want to live the way you want to live, and to projects near you.",
              "Blueprints: things that already work somewhere, so a community can start building rather than starting over.",
              "The conversation at real scale — thousands of voices, not a room's worth.",
            ]}
          />
          <P>
            It&apos;s also rough in places, being early. If something breaks or reads wrong,
            there&apos;s a feedback button on every page and we genuinely read all of it.
          </P>
        </Section>

        <Section title="Who's behind it">
          <P>
            World Co-Creation is a movement building tools for people who want to design
            what comes next rather than argue about what&apos;s broken. Not a company with
            customers — a group of people who decided to build the thing instead of waiting
            for permission.
          </P>
          <P>
            The code and prompts are public at{" "}
            <a
              href="https://github.com/ChristinaSCivics/wcc-compass"
              className="text-accent hover:text-foreground transition-colors"
            >
              github.com/ChristinaSCivics/wcc-compass
            </a>
            .
          </P>
        </Section>

        <footer className="mt-14 pt-8 border-t border-borderline">
          <p className="text-lg">The question is still just the one.</p>
          <p className="mt-1 text-muted leading-relaxed">
            How do <em>you</em> actually want to live?
          </p>
          <Link
            href={user ? "/dashboard" : "/login"}
            className="inline-block mt-7 px-8 py-3 border border-accent text-accent rounded-full
                       hover:bg-accent hover:text-background transition-all accent-glow"
          >
            {user ? "Back to the Compass →" : "Share your vision →"}
          </Link>
        </footer>
      </article>
    </main>
  );
}

/* ---------- layout helpers ---------- */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-14">
      <h2 className="text-3xl mb-6">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-muted leading-relaxed">{children}</p>;
}

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-5 py-4 border-b border-borderline last:border-0">
      <span className="text-accent font-mono text-sm pt-1 shrink-0">{n}</span>
      <div>
        <h3 className="text-lg mb-1">{title}</h3>
        <p className="text-muted text-sm leading-relaxed">{children}</p>
      </div>
    </div>
  );
}

function Ul({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 text-muted text-sm leading-relaxed">
          <span className="text-accent shrink-0">◈</span>
          {item}
        </li>
      ))}
    </ul>
  );
}
