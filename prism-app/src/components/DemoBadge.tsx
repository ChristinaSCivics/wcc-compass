/**
 * v0.1 / EARLY DEMO label.
 *
 * From the demo review: a stranger needs to know in the first breath that this
 * is an early look at something being built, not a finished product being
 * sold. It protects the demo from every rough edge and turns a limitation into
 * an invitation.
 *
 * `variant="full"` is the landing-page version with the explanation;
 * `variant="inline"` is the compact strip for inside the app.
 */
export function DemoBadge({ variant = "inline" }: { variant?: "full" | "inline" }) {
  if (variant === "full") {
    return (
      <div className="rounded-lg border border-borderline bg-surface/70 px-4 py-3 max-w-xl">
        <span className="text-[10px] text-amber tracking-[0.2em] uppercase">
          v0.1 · Early demo
        </span>
        <p className="text-sm text-muted leading-relaxed mt-1.5">
          This is an early demo. It&apos;s here so you can feel what we&apos;re building —
          the Proto-Compass is coming soon.
        </p>
      </div>
    );
  }

  return (
    <p className="text-[10px] tracking-[0.2em] uppercase text-amber">
      v0.1 · Early demo
      <span className="text-muted normal-case tracking-normal ml-2 text-xs">
        an early look at what we&apos;re building
      </span>
    </p>
  );
}
