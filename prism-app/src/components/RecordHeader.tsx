"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { isKnownKeeper } from "@/lib/keeperClient";
import { AdminNav } from "./AdminNav";
import { TopNav } from "./TopNav";
import { WccLogo } from "./WccLogo";

/**
 * The record is the one page three different kinds of visitor reach, so it
 * wears whichever header the visitor arrived with. A keeper following Record
 * from the admin nav was being dropped onto a public page with an "Enter"
 * button and no way back to the tools.
 *
 * Keeper state is read through useSyncExternalStore: it lives in this browser,
 * the server can't know it, and the server snapshot of `false` is what keeps
 * the markup consistent through hydration.
 */
export function RecordHeader({ signedIn }: { signedIn: boolean }) {
  const keeper = useSyncExternalStore(
    () => () => {},
    () => isKnownKeeper(),
    () => false
  );

  if (keeper) return <AdminNav />;
  if (signedIn) return <TopNav />;
  return (
    <nav className="flex items-center justify-between px-6 py-5 max-w-3xl mx-auto w-full gap-4">
      <Link href="/"><WccLogo height={24} /></Link>
      <Link href="/login" className="text-sm text-accent hover:text-foreground transition-colors">
        Enter &rarr;
      </Link>
    </nav>
  );
}
