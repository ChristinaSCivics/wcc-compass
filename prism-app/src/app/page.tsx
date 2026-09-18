import Link from "next/link";
import { WccLogo, WccMark } from "@/components/WccLogo";
import { mastermindDate, MASTERMIND } from "@/lib/mastermind";

/**
 * The hero holds three things and nothing else: the mark, the question, the
 * way in. Everything that used to sit under the button — the early-demo
 * notice, the mastermind card, the reassurance line — was competing with the
 * one action this page exists to produce, and a centred stack of seven items
 * reads as a list of notices rather than an invitation.
 *
 * The mastermind now lives below the fold as its own section, which is also
 * where it was asked to go: bottom of the page, and Prism raises it at the end
 * of a conversation.
 */
export default function Landing() {
  const when = mastermindDate();

  return (
    <main className="min-h-screen flex flex-col">
      <nav className="flex items-center justify-between px-6 sm:px-10 py-6 gap-4">
        <div className="flex items-center gap-3">
          <WccLogo height={30} />
          <span className="text-[10px] tracking-[0.18em] uppercase text-amber/80 whitespace-nowrap">
            v0.1
          </span>
        </div>
        <div className="flex items-center gap-6 shrink-0 text-sm">
          <Link href="/about" className="text-muted hover:text-accent transition-colors">
            What this is
          </Link>
          <Link href="/login" className="text-accent hover:text-foreground transition-colors">
            Enter →
          </Link>
        </div>
      </nav>

      {/* ---- the fold: one question, one way in ---- */}
      <section className="relative flex-1 min-h-[calc(100dvh-6rem)] flex flex-col justify-center
                          px-6 sm:px-10 pb-20 horizon fade-up overflow-hidden">
        {/* Brand presence without another line in the stack. */}
        <div
          className="pointer-events-none absolute -right-16 sm:right-4 top-1/2 -translate-y-1/2
                     opacity-[0.07] hidden sm:block"
          aria-hidden
        >
          <WccMark size={460} />
        </div>

        <div className="relative max-w-4xl mx-auto w-full">
          <h1 className="text-[2.75rem] sm:text-6xl lg:text-7xl leading-[1.05] max-w-3xl">
            How do <span className="text-accent italic">you</span> actually want to live?
          </h1>

          <p className="mt-7 text-lg sm:text-xl text-muted max-w-lg leading-relaxed">
            Your answer becomes part of humanity&apos;s first shared vision — and the plan
            we build to get there.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link
              href="/login"
              className="px-10 py-4 bg-accent text-background text-lg rounded-full
                         hover:bg-accent-soft transition-all accent-glow"
            >
              Share your vision
            </Link>
            <span className="text-sm text-muted">
              A few minutes. Stop whenever you like.
            </span>
          </div>
        </div>
      </section>

      {/* ---- below the fold ---- */}
      <section className="border-t border-borderline px-6 sm:px-10 py-16">
        <div className="max-w-4xl mx-auto w-full grid gap-10 sm:grid-cols-2">
          <div>
            <span className="block text-[10px] text-teal tracking-[0.18em] uppercase mb-3">
              What happens next
            </span>
            <h2 className="text-2xl mb-2">Come to the first mastermind</h2>
            <p className="text-sm text-muted leading-relaxed">
              A group call for everyone who&apos;s been through the Compass. We open on
              what we found we share, and go from there.
            </p>
            <p className="mt-4 text-sm">
              {when ? (
                <span className="text-foreground">{when}</span>
              ) : (
                <span className="text-muted">
                  Date coming shortly — it&apos;ll be posted here first.
                </span>
              )}
            </p>
            {when && MASTERMIND.registrationUrl && (
              <a
                href={MASTERMIND.registrationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-4 text-sm border border-teal text-teal rounded-full
                           px-5 py-2 hover:bg-teal hover:text-background transition-all"
              >
                Save my spot →
              </a>
            )}
          </div>

          <div className="sm:border-l sm:border-borderline sm:pl-10">
            <span className="block text-[10px] text-amber/80 tracking-[0.18em] uppercase mb-3">
              v0.1 · Early demo
            </span>
            <p className="text-sm text-muted leading-relaxed">
              This is an early demo. It&apos;s here so you can feel what we&apos;re
              building — the Proto-Compass is coming soon.
            </p>
            <Link
              href="/about"
              className="inline-block mt-4 text-sm text-accent hover:text-foreground transition-colors"
            >
              What this is &amp; how it works →
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
