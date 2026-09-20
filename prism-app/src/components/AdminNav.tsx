"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { WccMark } from "./WccLogo";
import { clearKeeperPassword, forgetKeeper } from "@/lib/keeperClient";

/**
 * Header for the admin tools.
 *
 * Deliberately not the member nav: an admin here may have no participant
 * identity at all, so links to Home, Collective and Decisions would just bounce
 * them to the entry page. This shows where they are and how to leave.
 */
export function AdminNav() {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-20 bg-background/90 backdrop-blur border-b border-borderline">
      <nav className="max-w-4xl mx-auto w-full px-6 py-3 flex items-center justify-between gap-4">
        <Link href="/admin" className="flex items-center gap-2.5 shrink-0">
          <WccMark size={22} />
          <span className="text-xs tracking-[0.2em] uppercase text-muted">Admin</span>
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/admin" className="text-muted hover:text-accent transition-colors">
            All tools
          </Link>
          <button
            onClick={() => {
              clearKeeperPassword();
              forgetKeeper();
              router.push("/admin");
              router.refresh();
            }}
            className="text-muted/60 hover:text-accent transition-colors"
            title="Forget the keeper password on this browser"
          >
            Sign out
          </button>
        </div>
      </nav>
    </header>
  );
}
