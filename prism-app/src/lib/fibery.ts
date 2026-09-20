/**
 * The WCC Fibery workspace, as far as the Compass needs it.
 *
 * Fibery already holds the people side of World Co-Creation in
 * Relationships/People — one record per person, with Name, Email, Source and a
 * participation status. The Compass collects a much narrower thing: a name
 * someone typed, and sometimes an email. This module is only about lining the
 * two up, so the demo feeds the CRM instead of becoming a second one.
 *
 * Read-only unless something calls `createPerson`. Nothing here runs without
 * FIBERY_TOKEN, and everything degrades to "not connected" rather than
 * throwing, so the admin page still works when the token is missing.
 */

const HOST = process.env.FIBERY_HOST || "worldcocreation.fibery.io";
const PEOPLE = "Relationships/People";

/** The participation statuses this app sets, by their enum ids in the workspace. */
const STATUS = {
  participant: "bafc1933-5e65-4f42-987e-c9db710c56e0",
  knownContact: "8c34c105-aec0-4838-a8b5-41e74a1b0f26",
};

export function fiberyConfigured(): boolean {
  return !!process.env.FIBERY_TOKEN;
}

export function fiberyHost(): string {
  return HOST;
}

type Command = { command: string; args: unknown };

async function run<T>(commands: Command[]): Promise<T[]> {
  const token = process.env.FIBERY_TOKEN;
  if (!token) throw new Error("FIBERY_TOKEN is not set");

  const res = await fetch(`https://${HOST}/api/commands`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Token ${token}`,
    },
    body: JSON.stringify(commands),
  });
  if (!res.ok) throw new Error(`Fibery replied ${res.status}`);

  const body = (await res.json()) as { success: boolean; result: T; message?: string }[];
  const failed = body.find((r) => !r.success);
  if (failed) throw new Error(failed.message ?? "Fibery rejected the command");
  return body.map((r) => r.result);
}

export type FiberyPerson = {
  id: string;
  publicId: string;
  name: string;
  email: string | null;
};

export async function fetchPeople(): Promise<FiberyPerson[]> {
  const [rows] = await run<Record<string, string | null>[]>([
    {
      command: "fibery.entity/query",
      args: {
        query: {
          "q/from": PEOPLE,
          "q/select": {
            id: "fibery/id",
            publicId: "fibery/public-id",
            name: "Relationships/Name",
            email: "Relationships/Email",
          },
          "q/limit": 1000,
        },
      },
    },
  ]);
  return (rows ?? []).map((r) => ({
    id: r.id as string,
    publicId: r.publicId as string,
    name: (r.name as string) ?? "",
    email: (r.email as string) || null,
  }));
}

/** Diacritics off, punctuation out, case flattened — "Alexandår" meets "Alexandar". */
export function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type Match =
  | { kind: "email"; person: FiberyPerson }
  | { kind: "name"; person: FiberyPerson }
  | { kind: "maybe"; person: FiberyPerson }
  | { kind: "ambiguous"; candidates: FiberyPerson[] }
  | { kind: "none" };

/**
 * Who in Fibery is this, if anyone?
 *
 * The Compass mostly collects first names, and Fibery holds full ones, so a
 * confident answer isn't always available. Rather than guess, this reports how
 * it knows: an email is proof, a full name is near enough, and a lone first
 * name is a lead for a person to confirm — never something to write on.
 */
export function matchPerson(
  contact: { name: string; emails: (string | null)[] },
  people: FiberyPerson[]
): Match {
  const emails = contact.emails.filter(Boolean).map((e) => e!.trim().toLowerCase());
  if (emails.length) {
    const hit = people.find((p) => p.email && emails.includes(p.email.trim().toLowerCase()));
    if (hit) return { kind: "email", person: hit };
  }

  const name = normalize(contact.name);
  if (!name) return { kind: "none" };

  const exact = people.filter((p) => normalize(p.name) === name);
  if (exact.length === 1) return { kind: "name", person: exact[0] };
  if (exact.length > 1) return { kind: "ambiguous", candidates: exact };

  // Given names against given names. Most people type only a first name here,
  // and the ones who type two sometimes give a different surname than the CRM
  // holds — "Alieona Riley" against "Alieona Williams". Either way this is a
  // lead for a person to confirm, never a merge.
  const given = name.split(" ")[0];
  const first = people.filter((p) => normalize(p.name).split(" ")[0] === given);
  if (first.length === 1) return { kind: "maybe", person: first[0] };
  if (first.length > 1) return { kind: "ambiguous", candidates: first };

  return { kind: "none" };
}

/** Create a record for someone Fibery hasn't met. Never touches an existing one. */
export async function createPerson(input: {
  name: string;
  email: string | null;
  source: string;
  signal: string;
  participant: boolean;
}): Promise<{ id: string }> {
  const [created] = await run<{ "fibery/id": string }>([
    {
      command: "fibery.entity/create",
      args: {
        type: PEOPLE,
        entity: {
          "Relationships/Name": input.name,
          ...(input.email ? { "Relationships/Email": input.email } : {}),
          "Relationships/Source": input.source,
          "Relationships/Signal": input.signal,
          "Relationships/Participation Status": {
            "fibery/id": input.participant ? STATUS.participant : STATUS.knownContact,
          },
        },
      },
    },
  ]);
  return { id: created["fibery/id"] };
}

/**
 * Fill an email onto a record that has none.
 *
 * Deliberately only ever fills a blank. The Source and Signal on these records
 * are things people wrote by hand — "Peter's cousin", "Kennedy Campaign" — and
 * a sync that overwrote them with "The Compass" would be vandalism dressed as
 * an integration.
 */
export async function fillEmail(id: string, email: string): Promise<void> {
  await run([
    {
      command: "fibery.entity/update",
      args: { type: PEOPLE, entity: { "fibery/id": id, "Relationships/Email": email } },
    },
  ]);
}

export function personUrl(publicId: string): string {
  return `https://${HOST}/${PEOPLE}/${publicId}`;
}
