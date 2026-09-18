"use client";

import Link from "next/link";
import { useState } from "react";
import { TopNav } from "@/components/TopNav";
import { KeeperGate } from "@/components/KeeperGate";
import {
  getKeeperPassword,
  clearKeeperPassword,
  rememberKeeper,
} from "@/lib/keeperClient";

/**
 * The admin door. Sign in once here and the tools below open without asking
 * again — each of them used to demand the password separately, which made
 * getting in feel like it had failed even when it hadn't.
 *
 * Not linked from anywhere a visitor goes.
 */
export default function Admin() {
  const [unlocked, setUnlocked] = useState(() => !!getKeeperPassword());
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function check() {
    setChecking(true);
    setError(null);
    const keeperPassword = getKeeperPassword();
    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keeperPassword }),
    }).catch(() => null);
    setChecking(false);

    if (!res) {
      setError("Couldn't reach the server.");
      return;
    }
    if (res.status === 403) {
      clearKeeperPassword();
      setError("That password wasn't right.");
      return;
    }
    if (!res.ok) {
      setError("Something went wrong signing in.");
      return;
    }
    rememberKeeper();
    setUnlocked(true);
  }

  return (
    <>
    <TopNav />
    <main className="min-h-screen max-w-3xl mx-auto w-full px-6 py-10">
      <h1 className="text-4xl mb-3">Admin</h1>
      <p className="text-muted mb-8 text-sm max-w-xl leading-relaxed">
        {unlocked
          ? "Signed in for this browser session. Every action you take here is recorded under your own name, not the password's."
          : "Sign in once and the tools below open without asking again."}
      </p>

      {!unlocked ? (
        <KeeperGate error={error} onSubmit={() => void check()} busy={checking} />
      ) : (
        <div className="grid gap-4">
          <Tool
            href="/admin/members"
            title="Who's here"
            sub="Everyone who has entered, how far they came, and which identities are sandboxes. Flag a test account to pull it out of the weave, the synthesis and the counts."
          />
          <Tool
            href="/admin/funnel"
            title="How far people get"
            sub="Arrivals, where people stop, how much they actually said, and where they came from."
          />
          <Tool
            href="/admin/feedback"
            title="Feedback"
            sub="What people have sent from the widget on every page."
          />
          <Tool
            href="/collective"
            title="The collective vision"
            sub="Weave on demand, rather than waiting for the automatic one."
          />
        </div>
      )}
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
