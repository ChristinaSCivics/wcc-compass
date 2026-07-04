"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PrismMark } from "./PrismMark";
import { FeedbackWidget } from "./FeedbackWidget";

const LINKS = [
  { href: "/dashboard", label: "Home" },
  { href: "/collective", label: "Collective" },
  { href: "/decisions", label: "Decisions" },
  { href: "/audit", label: "Record" },
  { href: "/about", label: "About" },
];

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.is_anonymous) {
      const sure = window.confirm(
        "You entered without an account, so signing out means this browser can't return to your conversations. Your confirmed vision stays safely on the map. Sign out?"
      );
      if (!sure) return;
    }
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <>
    <FeedbackWidget />
    <header className="sticky top-0 z-20 bg-background/90 backdrop-blur border-b border-borderline">
      <nav className="max-w-3xl mx-auto w-full px-6 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0">
          <PrismMark size={22} />
          <span className="hidden sm:inline text-xs tracking-[0.2em] uppercase text-muted">
            The Compass
          </span>
        </Link>
        <div className="flex items-center gap-1 sm:gap-2 text-sm">
          {LINKS.map((l) => {
            const active = pathname === l.href || (l.href !== "/dashboard" && pathname.startsWith(l.href));
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`px-2.5 sm:px-3 py-1.5 rounded-full transition-colors ${
                  active ? "text-gold bg-surface-raised" : "text-muted hover:text-foreground"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
          <button
            onClick={signOut}
            className="ml-1 px-2.5 py-1.5 text-muted/60 hover:text-gold transition-colors"
            title="Sign out"
          >
            Leave
          </button>
        </div>
      </nav>
    </header>
    </>
  );
}
