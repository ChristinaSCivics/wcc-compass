/**
 * The operating principle, stated where Prism has just drafted something.
 *
 * "AI drafts. Humans confirm." is already enforced architecturally — every
 * draft passes through a human confirm gate before it becomes a record.
 * This makes that promise legible to the person instead of implicit.
 */
export function PrismPromise({ children }: { children?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-borderline/60 bg-surface/50 px-4 py-3
                    flex flex-col sm:flex-row gap-1.5 sm:gap-3 sm:items-baseline">
      <span className="text-[10px] text-prism tracking-[0.2em] uppercase shrink-0">
        Prism drafts · you confirm
      </span>
      <span className="text-xs text-muted leading-relaxed">
        {children ??
          "Nothing here becomes a record until a person says it is true. Prism proposes; it never decides."}
      </span>
    </div>
  );
}
