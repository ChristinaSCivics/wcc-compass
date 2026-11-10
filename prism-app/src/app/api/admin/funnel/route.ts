import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkKeeper } from "@/lib/keeper";
import { personKey, saidPerConversation } from "@/lib/people";

/**
 * Keeper-only funnel: how many people arrive, how far they get, and where they
 * stop.
 *
 * Built entirely from records the app already keeps — arrivals, conversations,
 * message counts, vision status, signups — so it works retroactively over
 * everything that has already happened rather than starting from zero. Test
 * accounts are excluded throughout.
 *
 * What this cannot show: which buttons someone pressed, or the order they
 * visited pages in. That needs event tracking we don't do.
 *
 * Shapes only — no per-person list. That used to live here as well as on the
 * People page, which meant two rosters to keep honest; People is the one with
 * the sorting and the test flag on it, so it kept the job.
 */

type Joined = {
  city?: string | null;
  region?: string | null;
  country?: string | null;
  device?: string | null;
  noted_at?: string | null;
};

export async function POST(req: NextRequest) {
  const { keeperPassword, since, until } = await req.json();
  if (!checkKeeper(keeperPassword)) {
    return NextResponse.json({ error: "keeper password required" }, { status: 403 });
  }

  const admin = createAdminClient();
  const [{ data: profiles }, { data: convos }, userMsgsByConvo, { data: visions }, { data: signups }] =
    await Promise.all([
      admin.from("profiles").select("id, display_name, is_test, created_at, joined_from, person_id"),
      admin.from("conversations").select("id, user_id, kind, created_at"),
      saidPerConversation(admin),
      admin.from("vision_profiles").select("user_id, status, confirmed_at"),
      admin.from("mastermind_signups").select("user_id"),
    ]);

  // The window is applied to arrivals, and everything downstream follows from
  // that set — so "how far people got" answers for the day you asked about
  // rather than for all of history.
  const from = since ? new Date(since).getTime() : null;
  const to = (() => {
    if (!until) return null;
    const d = new Date(until);
    d.setHours(23, 59, 59, 999);
    return d.getTime();
  })();
  const inWindow = (iso: string | null) => {
    if (!iso) return false;
    const t = new Date(iso).getTime();
    if (from !== null && t < from) return false;
    if (to !== null && t > to) return false;
    return true;
  };

  const real = (profiles ?? [])
    .filter((p) => !p.is_test)
    .filter((p) => inWindow(p.created_at as string));

  // Exchanges = what the person actually typed (lib/people: PRiSM's replies
  // and the automatic opener don't count).
  //
  // Counted per person, not per spot (lib/people): entering without an account mints a new
  // spot on every device, so one person with three spots used to be three
  // arrivals, two of them "never spoke". A person's furthest point is the
  // furthest any of their spots reached.
  const personOf = new Map(real.map((p) => [p.id, personKey(p.display_name, p.id, p.person_id)]));
  const people = new Set(personOf.values());

  const deepestByUser = new Map<string, number>();
  const startedByUser = new Set<string>();
  for (const c of convos ?? []) {
    const who = personOf.get(c.user_id);
    if (!who) continue;
    startedByUser.add(who);
    const n = userMsgsByConvo.get(c.id) ?? 0;
    deepestByUser.set(who, Math.max(deepestByUser.get(who) ?? 0, n));
  }

  const signedUp = new Set((signups ?? []).map((s) => s.user_id).filter(Boolean));
  const reached = (test: (id: string) => boolean) =>
    new Set(real.filter((p) => test(p.id)).map((p) => personOf.get(p.id))).size;
  const visionByUser = new Map((visions ?? []).map((v) => [v.user_id, v]));

  const arrived = people.size;
  const started = startedByUser.size;
  const spoke = [...deepestByUser.values()].filter((n) => n >= 1).length;
  const wentDeep = [...deepestByUser.values()].filter((n) => n >= 4).length;
  const drafted = reached((id) => !!visionByUser.get(id));
  const confirmed = reached((id) => visionByUser.get(id)?.status === "confirmed");
  const asked = reached((id) => signedUp.has(id));

  // How far people got, as a distribution rather than an average — an average
  // hides the difference between "everyone stopped at three" and "half bounced".
  const buckets = [
    { label: "never spoke", min: 0, max: 0 },
    { label: "1–3 exchanges", min: 1, max: 3 },
    { label: "4–6", min: 4, max: 6 },
    { label: "7–10", min: 7, max: 10 },
    { label: "11+", min: 11, max: Infinity },
  ].map((b) => ({
    label: b.label,
    count: [...people].filter((who) => {
      const n = deepestByUser.get(who) ?? 0;
      return n >= b.min && n <= b.max;
    }).length,
  }));

  const joined = (p: (typeof real)[number]) => (p.joined_from ?? {}) as Joined;
  const tally = (key: keyof Joined) => {
    const out = new Map<string, number>();
    for (const p of real) {
      const v = joined(p)[key];
      if (!v) continue;
      out.set(String(v), (out.get(String(v)) ?? 0) + 1);
    }
    return [...out.entries()].sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ label, count }));
  };

  return NextResponse.json({
    funnel: [
      { step: "Arrived", count: arrived },
      { step: "Opened a conversation", count: started },
      { step: "Said something", count: spoke },
      { step: "Got 4+ exchanges in", count: wentDeep },
      { step: "Reached a draft", count: drafted },
      { step: "Confirmed a vision", count: confirmed },
      { step: "Asked for the mastermind", count: asked },
    ],
    depth: buckets,
    devices: tally("device"),
    regions: tally("region"),
    cities: tally("city"),
    testExcluded: (profiles ?? []).length - (profiles ?? []).filter((p) => !p.is_test).length,
    spots: real.length,
  });
}
