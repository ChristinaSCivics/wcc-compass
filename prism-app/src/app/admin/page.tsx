"use client";

import Link from "next/link";
import { useState } from "react";
import { AdminNav } from "@/components/AdminNav";
import { getAdminName } from "@/lib/adminIdentity";
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
    {unlocked && <AdminNav />}
    {unlocked ? (
      <main className="min-h-screen max-w-4xl mx-auto w-full px-6 py-10">
        <h1 className="text-4xl mb-2">
          {getAdminName() ? `Hello, ${getAdminName()}` : "Admin"}
        </h1>
        <p className="text-muted mb-8 text-sm max-w-xl leading-relaxed">
          Signed in for this browser session. Pick a tool from the top, or start here.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Tool
            href="/admin/members"
            title="People"
            sub="Everyone who has entered, how far they came, and which identities are sandboxes."
          />
          <Tool
            href="/admin/funnel"
            title="Journey"
            sub="Where people stop, how much they said, and where they came from."
          />
          <Tool
            href="/admin/feedback"
            title="Feedback"
            sub="What people sent from the widget on every page."
          />
          <Tool
            href="/admin/technical"
            title="Technical"
            sub="Models, scheduled jobs, call counts, and how it all fits together."
          />
        </div>

        <p className="text-xs text-muted/70 mt-10 leading-relaxed">
          To walk the product without touching the collective, enter through{" "}
          <a href="/test" className="text-accent underline">/test</a> — that identity is
          sandboxed from the start.
        </p>
      </main>
    ) : (
      <KeeperGate error={error} onSubmit={() => void check()} busy={checking} />
    )}
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
