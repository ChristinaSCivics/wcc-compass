/**
 * Where a voice came from, said the way a person would say it.
 *
 * Deliberately coarse. `joined_from` holds a city, and a city beside a vision
 * in a circle this small starts to point at a person. A state or a country
 * doesn't, and it's the part that's interesting anyway: this is a map of how
 * far the circle reaches, not of who lives where.
 */

const US_STATES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "Washington, D.C.",
  FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois",
  IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana",
  ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan",
  MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana",
  NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota",
  OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania",
  RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota",
  TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia",
  WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};

const COUNTRIES: Record<string, string> = {
  US: "the United States", CA: "Canada", GB: "the United Kingdom",
  AU: "Australia", NZ: "New Zealand", IE: "Ireland", DE: "Germany",
  FR: "France", ES: "Spain", IT: "Italy", NL: "the Netherlands",
  PT: "Portugal", MX: "Mexico", BR: "Brazil", IN: "India", JP: "Japan",
};

type Joined = { region?: string | null; country?: string | null } | null | undefined;

/** A state for someone in the US, a country for everyone else. */
export function placeOf(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const j = value as NonNullable<Joined>;
  const country = j.country?.toUpperCase() ?? null;
  const region = j.region?.toUpperCase() ?? null;
  if (country === "US" && region && US_STATES[region]) return US_STATES[region];
  if (country) return COUNTRIES[country] ?? country;
  return null;
}

/** "Delaware, Texas and Tennessee" — an English list, not a comma dump. */
export function listPlaces(places: string[]): string {
  if (places.length <= 1) return places[0] ?? "";
  if (places.length === 2) return `${places[0]} and ${places[1]}`;
  return `${places.slice(0, -1).join(", ")} and ${places.at(-1)}`;
}

/** The distinct places in a set of arrival records, commonest first. */
export function placesFrom(records: unknown[]): string[] {
  const counts = new Map<string, number>();
  for (const r of records) {
    const p = placeOf(r);
    if (p) counts.set(p, (counts.get(p) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([p]) => p);
}
