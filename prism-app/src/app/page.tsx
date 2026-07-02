import Link from "next/link";
import { PrismMark } from "@/components/PrismMark";

export default function Landing() {
  return (
    <main className="min-h-screen flex flex-col horizon">
      <nav className="flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-3">
          <PrismMark />
          <span className="text-sm tracking-[0.2em] uppercase text-muted">
            World Co-Creation
          </span>
        </div>
        <div className="flex items-center gap-6">
          <Link
            href="/about"
            className="text-sm text-muted hover:text-gold transition-colors"
          >
            About the prototype
          </Link>
          <Link
            href="/login"
            className="text-sm text-gold hover:text-foreground transition-colors"
          >
            Enter →
          </Link>
        </div>
      </nav>

      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 fade-up">
        <PrismMark size={64} />
        <h1 className="mt-8 text-5xl md:text-6xl max-w-3xl leading-tight">
          A world that works <span className="text-gold italic">for all</span>
        </h1>
        <p className="mt-6 max-w-xl text-muted text-lg leading-relaxed">
          The Compass is a new way for people to think together — beginning with a
          simple question: how do <em>you</em> actually want to live?
        </p>
        <Link
          href="/login"
          className="mt-10 px-8 py-3 border border-gold text-gold rounded-full
                     hover:bg-gold hover:text-background transition-all gold-glow"
        >
          Begin the conversation
        </Link>
        <p className="mt-16 text-xs text-muted max-w-md leading-relaxed">
          Founding-circle prototype. Your conversations are stored as part of the
          collective record; nothing is published as your vision until you confirm it.
          How Prism is instructed is public — read the prompts in the open repository.
        </p>
      </section>
    </main>
  );
}
