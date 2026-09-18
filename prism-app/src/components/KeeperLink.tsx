"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { isKnownKeeper } from "@/lib/keeperClient";

/**
 * A way back to the keeper tools without typing a URL from memory.
 *
 * Shown only on browsers that have already had a keeper password accepted by
 * the server, so a visitor never sees it — and a wrong guess never marks
 * anything.
 *
 * Read through useSyncExternalStore rather than an effect: this is browser
 * state the server cannot know, and the server snapshot of `false` is what
 * keeps the markup consistent through hydration.
 */
export function KeeperLink() {
  const show = useSyncExternalStore(
    () => () => {},
    () => isKnownKeeper(),
    () => false
  );

  if (!show) return null;

  return (
    <Link
      href="/admin"
      className="block rounded-xl border border-amber/40 bg-surface/60 px-4 py-3
                 transition-colors hover:border-amber"
    >
      <span className="block text-sm text-amber">Keeper tools</span>
      <span className="block text-xs text-muted mt-0.5">Who&apos;s here · how far they get</span>
    </Link>
  );
}
