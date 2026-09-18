"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { WccMark } from "./WccLogo";
import { FeedbackWidget } from "./FeedbackWidget";
import { disarmTestMode } from "@/lib/testMode";

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
  const [isTest, setIsTest] = useState(false);

  // A sandbox identity should never be mistakable for a real one — say so on
  // every page, not just at the door.
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles").select("is_test").eq("id", user.id).maybeSingle();
      setIsTest(!!data?.is_test);
    })();
  }, []);

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
    {isTest && (
      // Loud on purpose. A sandbox identity that looks like a real one is how
      // test visions end up counted as real voices on the map.
      <div className="sticky top-0 z-30 bg-amber/20 border-b-2 border-amber text-center py-2 px-4
                      flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <span className="text-xs text-amber tracking-[0.2em] uppercase font-medium">
          ◆ Test mode
        </span>
        <span className="text-xs text-muted">
          sandboxed — left out of the weave, the synthesis and the member counts
        </span>
        <button
          onClick={async () => {
            // The flag lives in this browser; the is_test mark lives on the
            // account. Clearing one without leaving the other would be a lie,
            // so turning it off also ends the sandbox session.
            disarmTestMode();
            const supabase = createClient();
            await supabase.auth.signOut();
            router.push("/login");
            router.refresh();
          }}
          className="text-xs text-amber/90 underline hover:text-foreground transition-colors"
        >
          turn off &amp; leave
        </button>
      </div>
    )}
    <header className="sticky top-0 z-20 bg-background/90 backdrop-blur border-b border-borderline">
      <nav className="max-w-3xl mx-auto w-full px-6 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0">
          <WccMark size={22} />
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
                  active ? "text-accent bg-surface-raised" : "text-muted hover:text-foreground"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
          <button
            onClick={signOut}
            className="ml-1 px-2.5 py-1.5 text-muted/60 hover:text-accent transition-colors"
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
