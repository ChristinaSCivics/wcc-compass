"use client";

/**
 * Where you are, and that you can stop.
 *
 * Two failures showed up in testing. People went twenty-plus exchanges deep
 * and disengaged before Prism offered to stop — and one tester talked for 27
 * messages that never became a draft at all, because the only way out was a
 * button in the header she never noticed.
 *
 * So this is deliberately loud about two things: roughly how far along you
 * are, and that finishing is available right now. The estimate is honest —
 * "most people are done around here", never a bar that implies a required
 * length.
 */
export function ConversationProgress({
  exchanges,
  typical,
  onFinish,
  disabled,
}: {
  /** Completed back-and-forths so far. */
  exchanges: number;
  /** Where most people finish — the soft target, not a requirement. */
  typical: number;
  onFinish: () => void;
  disabled?: boolean;
}) {
  const pct = Math.min(100, Math.round((exchanges / typical) * 100));
  const past = exchanges >= typical;

  const label = past
    ? "You have more than enough for a rich draft"
    : exchanges <= 1
      ? "Just getting started"
      : pct < 50
        ? "Early on — no rush"
        : pct < 85
          ? "About halfway"
          : "Nearly there";

  return (
    <div className="px-6 pt-3 pb-2 border-b border-borderline bg-background/90 backdrop-blur">
      <div className="flex items-baseline justify-between gap-3 mb-1.5 flex-wrap">
        <span className="text-xs text-muted">
          {label}
          <span className="text-muted/60">
            {" · "}
            {past
              ? `${exchanges} exchanges in`
              : `most people finish around ${typical}`}
          </span>
        </span>
        <button
          type="button"
          onClick={onFinish}
          disabled={disabled}
          className={`text-xs rounded-full px-3 py-1 transition-all disabled:opacity-40 ${
            past
              ? "bg-accent text-background hover:bg-accent-soft"
              : "border border-accent text-accent hover:bg-accent hover:text-background"
          }`}
        >
          Finish whenever you like →
        </button>
      </div>
      <div
        className="h-1 w-full rounded-full bg-borderline overflow-hidden"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="How far along this conversation is"
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            past ? "bg-accent" : "bg-accent/60"
          }`}
          style={{ width: `${Math.max(6, pct)}%` }}
        />
      </div>
    </div>
  );
}
