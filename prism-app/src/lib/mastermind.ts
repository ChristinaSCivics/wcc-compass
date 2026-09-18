/**
 * The mastermind call — the demo's exit action.
 *
 * ▼▼▼ FILL THESE IN ▼▼▼
 * The date and registration link were still open when this was built
 * ("What's the actual mastermind date?" was flagged as a blocking item).
 * Until `date` and `registrationUrl` are set, the homepage shows the call as
 * announced-but-not-yet-scheduled rather than inventing a date.
 */
export const MASTERMIND = {
  /** e.g. "2026-10-02T19:00:00-04:00" — ISO 8601 with timezone offset. */
  date: null as string | null,
  /** Zoom registration URL. */
  registrationUrl: null as string | null,
} as const;

/** Human-readable date, or null while unscheduled. */
export function mastermindDate(): string | null {
  if (!MASTERMIND.date) return null;
  const d = new Date(MASTERMIND.date);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}
