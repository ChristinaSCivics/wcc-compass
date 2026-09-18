import Link from "next/link";
import { TopNav } from "@/components/TopNav";

/**
 * Index of the keeper tools, so they can be reached from one address instead
 * of remembered individually. Each page still asks for the keeper password —
 * this page only lists what exists.
 */
export default function KeeperIndex() {
  return (
    <>
    <TopNav />
    <main className="min-h-screen max-w-3xl mx-auto w-full px-6 py-10">
      <h1 className="text-4xl mb-3">Keeper tools</h1>
      <p className="text-muted mb-8 text-sm max-w-xl leading-relaxed">
        Not linked from anywhere a visitor goes. Each of these asks for the keeper
        password, and every action taken with it is recorded under your own name.
      </p>

      <div className="grid gap-4">
        <Tool
          href="/keeper/members"
          title="Who's here"
          sub="Everyone who has entered, how far they came, and which identities are sandboxes. Flag a test account to pull it out of the weave, the synthesis and the counts."
        />
        <Tool
          href="/keeper/funnel"
          title="How far people get"
          sub="Arrivals, where people stop, how much they actually said, and where they came from."
        />
        <Tool
          href="/keeper/feedback"
          title="Feedback"
          sub="What people have sent from the widget on every page."
        />
        <Tool
          href="/collective"
          title="The collective vision"
          sub="Weave on demand, rather than waiting for the automatic one."
        />
      </div>
    </main>
    </>
  );
}

function Tool({ href, title, sub }: { href: string; title: string; sub: string }) {
  return (
    <Link
      href={href}
      className="block rounded-xl border border-borderline bg-surface p-6 transition-all hover:border-accent"
    >
      <h2 className="text-xl mb-1">{title}</h2>
      <p className="text-sm text-muted leading-relaxed">{sub}</p>
    </Link>
  );
}
