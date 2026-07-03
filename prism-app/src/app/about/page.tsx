import Link from "next/link";
import { PrismMark } from "@/components/PrismMark";

export const metadata = {
  title: "About the Prototype — The Compass",
  description:
    "What we built, why we built it this way, every decision we made, and where it goes next.",
};

export default function About() {
  return (
    <main className="min-h-screen horizon">
      <nav className="flex items-center justify-between px-8 py-6 max-w-3xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-3">
          <PrismMark />
          <span className="text-sm tracking-[0.2em] uppercase text-muted">
            World Co-Creation
          </span>
        </Link>
        <Link href="/login" className="text-sm text-gold hover:text-foreground transition-colors">
          Enter →
        </Link>
      </nav>

      <article className="max-w-3xl mx-auto w-full px-8 pb-24">
        <header className="py-12">
          <PrismMark size={48} />
          <h1 className="mt-6 text-4xl md:text-5xl leading-tight">
            The Compass, <span className="text-gold italic">v0.1</span>
          </h1>
          <p className="mt-4 text-muted text-lg leading-relaxed max-w-xl">
            A working prototype of the tool we&apos;ve been talking about — built so we
            can stop describing it and start <em>feeling</em> it. This page explains
            what it does, every decision behind it, and where it goes next.
          </p>
        </header>

        {/* ============ WHAT IT IS ============ */}
        <Section title="What this is">
          <P>
            In Meeting #2 we agreed the fastest way to bring people in is to{" "}
            <em>show</em> them — &ldquo;Ah, I see what you&apos;re doing.&rdquo; This is
            that demo, with one deliberate upgrade: <strong>nothing here is throwaway.</strong>{" "}
            The app is v0.1 of many, but every conversation, every confirmed vision, every
            decision record is stored in a durable, portable database that outlives any
            version of the software. We start collecting the real data — the collective
            map — from day one.
          </P>
          <P>Two things work end-to-end today:</P>
          <Card title="1 · The Global Values Survey">
            The first conversation from Peter&apos;s presentation, real and working. Prism
            greets you, invites you to dream unbounded, and interviews you about your ideal
            life and community — following up, asking what your big words mean to you,
            reflecting back what it heard. When the picture is whole, Prism drafts a
            structured version of your vision — and then the most important step:{" "}
            <strong>you edit and confirm it.</strong> Nothing becomes &ldquo;your
            vision&rdquo; until you say it&apos;s true.
          </Card>
          <Card title="2 · The Decision Engine (founding-circle pilot)">
            The all-win process, pointed at ourselves first. We open a real decision we
            actually face — for example, <em>what legal structure do we start with?</em>{" "}
            Prism interviews each of us privately (Socratic method: define the terms, find
            the needs beneath the positions, name real red lines). Each person confirms
            their input. Then Prism synthesizes across everyone: where we already agree,
            which conflicts are just words, which are real, and candidate options — each
            scored against every person&apos;s stated needs, each carrying an explicit{" "}
            <span className="text-gold">golden-rule check: &ldquo;who, if anyone, is harmed?&rdquo;</span>{" "}
            Prism proposes. We decide. The outcome and rationale enter the permanent record.
          </Card>
        </Section>

        {/* ============ PRINCIPLES ============ */}
        <Section title="The thinking behind it">
          <Principle n="01" title="The data is the asset; the app is disposable">
            We will rebuild the interface ten times. What must survive is the record:
            transcripts, confirmed visions, decisions, and their reasoning. So the
            database schema came first, designed to be permanent, and everything else is
            replaceable scaffolding around it.
          </Principle>
          <Principle n="02" title="The AI drafts — only the human makes it true">
            Our strongest answer to &ldquo;how do we know the AI isn&apos;t biased?&rdquo;
            After every interview, Prism shows you what it captured — and you correct,
            rewrite, or delete anything before confirming. Only confirmed records enter
            the synthesis. The LLM never gets the last word on what a person means.
          </Principle>
          <Principle n="03" title="Prism is a facilitator, never an opinion-holder">
            Prism&apos;s instructions forbid it from holding positions on politics,
            religion, or ways of life, from labeling anyone&apos;s values, and from
            &ldquo;improving&rdquo; anyone&apos;s vision. It elicits, clarifies, reflects,
            and connects. And those instructions aren&apos;t secret —{" "}
            <strong>the prompts are published in the open repository</strong>, so anyone
            can read exactly how Prism is told to behave. In the open, in the light.
          </Principle>
          <Principle n="04" title="No manufactured consensus">
            The synthesis is explicitly instructed that a real conflict surfaced is
            progress, and false harmony is corruption of the process. Options that cross
            someone&apos;s stated red line must say so. Every option must answer
            &ldquo;who is harmed?&rdquo; — including people outside the group.
          </Principle>
          <Principle n="05" title="Tamper-evident from day one">
            Every significant event — a vision confirmed, a synthesis run, a decision
            ratified — is written to an append-only log where each entry is
            cryptographically chained to the one before it. No one, including the people
            running the servers, can quietly rewrite history without breaking the chain.
            Anyone can inspect it on the <Link href="/audit" className="text-gold">open record</Link> page.
          </Principle>
        </Section>

        {/* ============ DECISIONS ============ */}
        <Section title="Decisions we made (and why)">
          <Decision
            q="Build on an existing AI, or start from scratch?"
            a="We start on an existing model (Anthropic's Claude), exactly as discussed in Meeting #2: speed now, purity later. Building a clean-slate model would take years we don't have; the prototype exists to learn what the process needs. The design keeps us portable — the prompts and data are ours, and the model behind Prism is one swappable setting. The roadmap adds multi-model cross-checking (including open-source models), so no single company's model quietly shapes the synthesis."
          />
          <Decision
            q="What about the blockchain?"
            a="Phased, deliberately. Putting wallets, tokens, and gas fees in front of people on day one would scare off exactly who we most need, without delivering what the vision actually asks for: verifiable transparency. So v0.1 ships the hash chain (tamper-evident history, zero cost, invisible friction). The next phase anchors the chain's fingerprint to a public blockchain — free, and independently verifiable by anyone. Full decentralization — on-chain governance, the financial model — is a deliberate later conversation, not a default."
          />
          <Decision
            q="Why Postgres / Supabase for the data?"
            a="The real choice was 'Postgres, the open standard' — the world's most battle-tested open-source database, with zero lock-in: we can export everything and move to community-controlled, self-hosted infrastructure at any time without rewriting anything. Supabase is just a convenient open-source on-ramp with auth and row-level security built in. We rejected proprietary options (Firebase, etc.) as a bad fit for a movement about not being owned."
          />
          <Decision
            q="Who can see what?"
            a="Your interview conversations are private to you. Only what you confirm becomes visible to the circle. Decision inputs work the same way — private interview, confirmed input visible. The audit log is readable by every member. The meeting transcripts and members' personal details are NOT in the public code repository."
          />
          <Decision
            q="Where does it live right now?"
            a="Temporary home: Christina's personal accounts (GitHub, Vercel, Supabase, Anthropic), clearly labeled as such, at zero hosting cost (free tiers). Everything is code-defined and reproducible, so when the org accounts exist — a decision for the structure working group — we re-provision under organization ownership in an afternoon. Nothing is trapped."
          />
          <Decision
            q="What does it cost?"
            a="Hosting: $0 (free tiers). The AI: pay-per-conversation — a full values interview costs roughly 10–20 cents, and the entire founding-circle pilot should run under $10 total. At movement scale this becomes a real budget line — one for the finance working group, with usage data from this pilot to base it on."
          />
          <Decision
            q="Why is the code public already?"
            a="Because the movement's core claim is 'in the open, in the light,' and that has to include us. Anyone can read the code and — more importantly — the exact instructions Prism runs on. Personal data stays out; the process stays open."
          />
        </Section>

        {/* ============ PRIVACY ============ */}
        <div id="privacy">
          <Section title="How your words are kept">
            <Ul
              items={[
                "Your conversations with Prism are private to you. Nothing is shown to anyone as your vision until you review, edit, and confirm it yourself.",
                "Entering takes only a name — no account, no email. Your identity lives in your browser for now; full accounts come later.",
                "Because visions are regional and local, we note your approximate area at entry (city-level, inferred from your connection), your timezone, and device type. We never collect your address, precise location, or IP address, and we never track you across other sites.",
                "Significant events (a vision confirmed, a decision recorded) go on a tamper-evident log so history can't be quietly rewritten — that's protection for you, not surveillance of you.",
                "All of this is verifiable: the code and Prism's instructions are public.",
              ]}
            />
          </Section>
        </div>

        {/* ============ HONEST LIMITS ============ */}
        <Section title="Honest limits of v0.1">
          <Ul
            items={[
              "Prism runs on one commercial model. Its training carries a worldview; the confirm step and published prompts contain that, but don't eliminate it. Multi-model verification is the real answer, and it's next.",
              "The synthesis has not yet been tested on a real group decision — that test is exactly what this pilot is for.",
              "The 60-second personal 'vision video' from Peter's demo isn't built yet (video generation is ready when we are).",
              "The collective conversation — big questions, topics, thousands of voices — exists in the schema but not yet in the interface. v0.1 is the circle, not the world.",
              "No formal privacy policy / consent language yet. Before this goes beyond people we know, that gets written.",
            ]}
          />
        </Section>

        {/* ============ ROADMAP ============ */}
        <Section title="Roadmap">
          <Phase when="Now — the pilot" items={[
            "Founding circle members complete the values survey; the collective map begins",
            "Run one real decision (proposal: our legal structure) through the full engine",
            "Learn, in our own nervous systems, what the process needs to feel like",
          ]} />
          <Phase when="Next — PRiSM 0.1, 'The Dispatcher'" items={[
            "When someone arrives from The Call, PRiSM draws out their gifts and blueprint (the interview already captures this), matches them with others carrying a similar piece, points them to a team with a starter kit, and hands them one clear next step",
            "A human host welcomes every new Builder personally — PRiSM notices host-spark at intake, so every wave of newcomers produces the next wave's welcomers",
            "The World Co-Creation Guide becomes PRiSM's seed knowledge, so the full vision carries at infinite scale",
            "Move to organization-owned accounts; consent language + privacy policy before wider onboarding",
          ]} />
          <Phase when="Then — PRiSM 0.2 and the Compass" items={[
            "Team coordination and project tools — the nervous system of a movement of action cells",
            "The collective conversation: big questions, topics, blueprint ingestion from allied organizations",
            "Multi-model cross-checking on synthesis + a bias evaluation suite; anchor the audit chain to a public blockchain",
            "Personal vision videos to share — growth through genuine inspiration, not ads",
            "Local instances — neighborhoods and orgs running the process on their own questions ('show a win' locally)",
            "One PRiSM fronts both tools: the movement-coordination system and the Compass — everything learned carries forward",
          ]} />
        </Section>

        {/* ============ OPEN QUESTIONS ============ */}
        <Section title="Open questions for the circle">
          <Ul
            items={[
              "How much autonomy does Prism get? Today: none — it drafts, humans confirm, facilitators trigger synthesis, the group ratifies. Is that the permanent shape, or does trusted automation grow with earned trust?",
              "What decision do we pilot first — legal structure, starting tools, or something else with real stakes?",
              "Who are the first people outside the circle to experience the values survey, and what do we want to learn from them?",
              "When do we consider the demo 'shown' and shift energy to v0.2?",
            ]}
          />
        </Section>

        <footer className="mt-16 pt-8 border-t border-borderline">
          <p className="text-muted text-sm leading-relaxed">
            Built by the founding circle, July 2026. The code and Prism&apos;s full
            instructions are public at{" "}
            <a
              href="https://github.com/ChristinaSCivics/wcc-compass"
              className="text-gold hover:text-foreground transition-colors"
            >
              github.com/ChristinaSCivics/wcc-compass
            </a>
            .
          </p>
          <Link
            href="/login"
            className="inline-block mt-8 px-8 py-3 border border-gold text-gold rounded-full
                       hover:bg-gold hover:text-background transition-all gold-glow"
          >
            Experience it yourself →
          </Link>
        </footer>
      </article>
    </main>
  );
}

/* ---------- layout helpers ---------- */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-16">
      <h2 className="text-3xl mb-6">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-muted leading-relaxed">{children}</p>;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-borderline bg-surface p-6">
      <h3 className="text-xl mb-2 text-gold">{title}</h3>
      <p className="text-muted leading-relaxed text-sm">{children}</p>
    </div>
  );
}

function Principle({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-5 py-4 border-b border-borderline">
      <span className="text-gold font-mono text-sm pt-1 shrink-0">{n}</span>
      <div>
        <h3 className="text-lg mb-1">{title}</h3>
        <p className="text-muted text-sm leading-relaxed">{children}</p>
      </div>
    </div>
  );
}

function Decision({ q, a }: { q: string; a: string }) {
  return (
    <div className="rounded-xl border border-borderline bg-surface p-6">
      <h3 className="text-lg mb-2">{q}</h3>
      <p className="text-muted text-sm leading-relaxed">{a}</p>
    </div>
  );
}

function Ul({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 text-muted text-sm leading-relaxed">
          <span className="text-gold shrink-0">◈</span>
          {item}
        </li>
      ))}
    </ul>
  );
}

function Phase({ when, items }: { when: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-borderline bg-surface p-6">
      <h3 className="text-gold text-sm tracking-widest uppercase mb-3">{when}</h3>
      <Ul items={items} />
    </div>
  );
}
