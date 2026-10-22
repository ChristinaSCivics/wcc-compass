import Link from "next/link";
import { WccLogo } from "@/components/WccLogo";
import { TopNav } from "@/components/TopNav";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Privacy — The Compass",
  description: "What the Compass collects, where it goes, how long it's kept, and how to delete it.",
};

// Every line here has to stay true to the code. When collection, storage or
// sharing changes, this page changes in the same commit.
const UPDATED = "October 21, 2026";
const CONTACT = "admin@worldcocreation.com";

export default async function Privacy() {
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
          <h1 className="text-4xl md:text-5xl leading-tight">Privacy</h1>
          <p className="mt-4 text-muted text-lg leading-relaxed max-w-xl">
            What the Compass keeps, where it goes, how long we hold it, and how to have it
            deleted. The Compass is in beta, run by World Co-Creation, and this page describes
            exactly what it does today.
          </p>
          <p className="mt-3 text-sm text-muted">Last updated {UPDATED}</p>
        </header>

        <Section title="Who it's for">
          <P>
            The Compass is for people 18 and older. If you&apos;re under 18, please don&apos;t
            use it. If we learn that someone under 18 has, we&apos;ll delete what they shared.
          </P>
        </Section>

        <Section title="What we collect">
          <Ul
            items={[
              "A name or handle you choose. It doesn't have to be your real name, and no account is needed.",
              "Your conversation with PRiSM, in full, and the vision you edit and confirm.",
              "If you choose to save your spot: your email and a password, so you can sign back in.",
              "If you join the mastermind list: your email, and whether you ticked the box for occasional updates.",
              "Anything you send through the feedback button.",
              "If you do the \u201cWhat Piece(s) of the Puzzle Do You Bring?\u201d conversation: that conversation, the recap you edit, and the permissions you choose. If you tick \u201ccontact me\u201d, also the name, email, optional phone and contact preference you give, plus — only if you tick those boxes too — the organizations and people you mentioned.",
              "When you first enter: your approximate location (country, region and city, worked out by our host from your connection — not GPS), your timezone, your browser's language, and whether you're on a phone, tablet or computer. We don't store your IP address.",
            ]}
          />
          <P>We don&apos;t ask for your phone number, your age, or your birthday.</P>
        </Section>

        <Section title="Who can see it">
          <Ul
            items={[
              "Your conversation is private to you and the small team that runs the Compass.",
              "Your confirmed vision is shown to other members without your name. Shared pages describe people by proportion, never by person.",
              "Your name, email and location are visible only to you and the team.",
              "Your \u201cpiece of the puzzle\u201d recap reaches the team only if you tick \u201ccontact me\u201d. If you don\u2019t, it\u2019s counted only in anonymous totals (for example, how many people offered design help), with no name attached.",
              "The open log records that something happened and when — never your words or your name.",
            ]}
          />
        </Section>

        <Section title="Where it goes">
          <P>A few services do the work behind the Compass:</P>
          <Ul
            items={[
              "Anthropic (Claude) runs PRiSM. Your conversation is sent to Anthropic to generate replies and draft your vision. Under its commercial terms, Anthropic doesn't use it to train its models.",
              "Supabase stores the database: your profile, conversations and visions. It's hosted in Canada.",
              "Vercel hosts the site and counts page visits with Vercel Analytics, which uses no cookies and doesn't identify you.",
              "Fibery is World Co-Creation's internal contact list. If you gave us an email, the team may add your name, email, how you joined and your rough location so someone can follow up. Your conversation and vision are never copied there.",
              "YouTube plays the video on the About page, and loads nothing until you press play.",
              "If you use the mic button, your browser turns your speech into text before anything is sent — in Chrome that's done by Google's speech service, in Safari by Apple's. We only ever receive the text.",
            ]}
          />
          <P>We don&apos;t sell your information, run ads, or use advertising trackers.</P>
        </Section>

        <Section title="Cookies and browser storage">
          <P>
            The Compass sets one kind of cookie: the sign-in cookie that keeps you logged in.
            It also saves a couple of small settings in your browser, such as whether
            you&apos;re in test mode. There is no Google Analytics and nothing that follows you
            to other sites.
          </P>
        </Section>

        <Section title="How long we keep it">
          <Ul
            items={[
              "We keep your information for as long as the Compass is running and it's useful for that work, or until you ask us to delete it.",
              "We may clear out old or inactive records from time to time, especially spots that were never saved with an email.",
              "The open log is permanent by design, so it can't be quietly rewritten. It holds no words or names, only what kind of event happened, when, and a fingerprint that proves a record wasn't changed.",
            ]}
          />
        </Section>

        <Section title="Deleting or correcting your information">
          <P>
            You can edit your vision yourself at any time. To have everything deleted — your
            profile, conversation, vision and email — or to correct something you can&apos;t
            edit, email{" "}
            <a href={`mailto:${CONTACT}`} className="text-accent underline underline-offset-4">
              {CONTACT}
            </a>{" "}
            with the name you used, and the email if you saved one. We&apos;ll confirm when
            it&apos;s done. Deleting removes you from future weavings of the collective map; a
            weaving already published was written without names, so nothing in it points
            back to you.
          </P>
        </Section>

        <Section title="Your choices">
          <P>
            You can ask for a copy of what we hold about you, ask us to correct it, or ask us
            to delete it, by writing to the address above. You can also ask to be removed from
            our contact list or the mastermind list at any time without deleting your vision.
          </P>
        </Section>

        <Section title="Keeping it safe">
          <P>
            Your information is stored with providers that encrypt it in transit and at rest,
            and only the small team that runs the Compass can see account details. No system
            is perfectly secure, so please don&apos;t share anything in your conversation that
            you&apos;d be harmed by if it ever got out — a real name of someone else, a health
            record number, a password.
          </P>
          <P>
            Some of the services above are based in the United States, so your information may
            be processed there. We&apos;d share information beyond these services only if the
            law required it.
          </P>
        </Section>

        <Section title="Questions">
          <P>
            Write to{" "}
            <a href={`mailto:${CONTACT}`} className="text-accent underline underline-offset-4">
              {CONTACT}
            </a>
            . The Compass&apos;s code and PRiSM&apos;s full instructions are public at{" "}
            <a
              href="https://github.com/ChristinaSCivics/wcc-compass"
              className="text-accent hover:text-foreground transition-colors"
            >
              github.com/ChristinaSCivics/wcc-compass
            </a>
            , so you can check any of this for yourself. If this page changes, the date at the
            top changes with it.
          </P>
        </Section>
      </article>
    </main>
  );
}

/* ---------- layout helpers (same as /about) ---------- */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="text-2xl mb-5">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-muted leading-relaxed">{children}</p>;
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
