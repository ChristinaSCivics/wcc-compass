"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import { WccMark } from "./WccLogo";
import { clearKeeperPassword, forgetKeeper } from "@/lib/keeperClient";
import { clearAdminName, getAdminName } from "@/lib/adminIdentity";

/**
 * Header for the admin tools.
 *
 * Deliberately not the member nav: an admin here may have no participant
 * identity at all, so links to Home, Collective and Decisions would only bounce
 * them to the entry page. This shows where they are, who they're signed in as,
 * and how to leave.
 */
const TOOLS = [
  { href: "/admin/members", label: "People" },
  { href: "/admin/funnel", label: "Journey" },
  { href: "/admin/feedback", label: "Feedback" },
  { href: "/admin/technical", label: "Technical" },
];

export function AdminNav() {
  const router = useRouter();
  const pathname = usePathname();

  // Browser state the server can't know; read without an effect so the markup
  // stays consistent through hydration.
  const who = useSyncExternalStore(
    () => () => {},
    () => getAdminName(),
    () => null
  );

  return (
    <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-borderline">
      <nav className="max-w-4xl mx-auto w-full px-6 py-3 flex items-center gap-4 flex-wrap">
        <Link href="/admin" className="flex items-center gap-2.5 shrink-0">
          <WccMark size={20} />
          <span className="text-xs tracking-[0.2em] uppercase text-muted">Admin</span>
        </Link>

        <div className="flex items-center gap-1 text-sm flex-1 min-w-0 overflow-x-auto">
          {TOOLS.map((t) => {
            const active = pathname === t.href;
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${
                  active ? "text-accent bg-surface-raised" : "text-muted hover:text-foreground"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-3 shrink-0 text-xs">
          {who && <span className="text-muted hidden sm:inline">{who}</span>}
          <button
            onClick={() => {
              // The name lives in this browser; the password gates the server.
              // Leaving should drop both, or the next person inherits a signature.
              clearKeeperPassword();
              clearAdminName();
              forgetKeeper();
              router.push("/admin");
              router.refresh();
            }}
            className="text-muted/60 hover:text-accent transition-colors"
          >
            Sign out
          </button>
        </div>
      </nav>
    </header>
  );
}
