"use client";

/**
 * A shared window for the admin views, so "how far did people get" and "who's
 * here" can be asked about a particular day — the convention, say — rather
 * than about all of history at once.
 *
 * Presets cover what gets asked in practice; the custom dates are there for
 * the day after, when someone wants to know how one afternoon went.
 */
export type Range = { since: string | null; until: string | null };

const PRESETS: { label: string; days: number | null }[] = [
  { label: "All time", days: null },
  { label: "Today", days: 0 },
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
];

export function startOfDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/** Inclusive of the whole `until` day, which is what a person means by it. */
export function withinRange(iso: string | null | undefined, range: Range): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (range.since && t < new Date(range.since).getTime()) return false;
  if (range.until) {
    const end = new Date(range.until);
    end.setHours(23, 59, 59, 999);
    if (t > end.getTime()) return false;
  }
  return true;
}

export function DateRange({
  range,
  onChange,
  count,
}: {
  range: Range;
  onChange: (r: Range) => void;
  /** What's currently in view, so the filter shows its own effect. */
  count?: string;
}) {
  const activePreset = (days: number | null) =>
    days === null
      ? !range.since && !range.until
      : !range.until && range.since === startOfDaysAgo(days);

  return (
    <div className="rounded-xl border border-borderline bg-surface p-4 mb-6 flex flex-wrap items-center gap-3">
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() =>
              onChange({ since: p.days === null ? null : startOfDaysAgo(p.days), until: null })
            }
            className={`text-xs rounded-full px-3 py-1.5 transition-colors ${
              activePreset(p.days)
                ? "bg-accent text-background"
                : "border border-borderline text-muted hover:text-foreground"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 text-xs text-muted">
        <input
          type="date"
          value={range.since ? range.since.slice(0, 10) : ""}
          onChange={(e) =>
            onChange({
              ...range,
              since: e.target.value ? new Date(e.target.value).toISOString() : null,
            })
          }
          className="bg-surface-raised border border-borderline rounded-lg px-2.5 py-1.5
                     focus:outline-none focus:border-accent transition-colors"
        />
        <span>to</span>
        <input
          type="date"
          value={range.until ? range.until.slice(0, 10) : ""}
          onChange={(e) =>
            onChange({
              ...range,
              until: e.target.value ? new Date(e.target.value).toISOString() : null,
            })
          }
          className="bg-surface-raised border border-borderline rounded-lg px-2.5 py-1.5
                     focus:outline-none focus:border-accent transition-colors"
        />
      </div>

      {count && <span className="text-xs text-muted ml-auto">{count}</span>}
    </div>
  );
}
