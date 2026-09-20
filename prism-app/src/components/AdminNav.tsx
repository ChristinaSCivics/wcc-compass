"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { WccMark } from "./WccLogo";
import { clearKeeperPassword, forgetKeeper } from "@/lib/keeperClient";

/**
 * Header for the admin tools.
 *
 * Deliberately not the member nav: an admin here may have no participant
 * identity at all, so links to Home, Collective and Decisions would just bounce
 * them to the entry page. This shows where they are and how to leave.
 */
const TOOLS = [
  { href: "/admin/members", label: "Who's here" },
  { href: "/admin/funnel", label: "How far" },
  { href: "/admin/feedback", label: "Feedback" },
];

export function AdminNav() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 bg-background/90 backdrop-blur border-b border-borderline">
      <nav className="max-w-4xl mx-auto w-full px-6 py-3 flex items-center justify-between gap-4">
        <Link href="/admin" className="flex items-center gap-2.5 shrink-0">
          <WccMark size={22} />
          <span className="text-xs tracking-[0.2em] uppercase text-muted">Admin</span>
        </Link>
        <div className="flex items-center gap-1 sm:gap-2 text-sm">
          {TOOLS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={`px-2.5 sm:px-3 py-1.5 rounded-full transition-colors ${
                pathname === t.href
                  ? "text-accent bg-surface-raised"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {t.label}
            </Link>
          ))}
          <button
            onClick={() => {
              clearKeeperPassword();
              forgetKeeper();
              router.push("/admin");
              router.refresh();
            }}
            className="ml-1 px-2.5 py-1.5 text-muted/60 hover:text-accent transition-colors"
            title="Forget the keeper password on this browser"
          >
            Sign out
          </button>
        </div>
      </nav>
    </header>
  );
}
