import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkKeeper } from "@/lib/keeper";

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
  const [{ data: profiles }, { data: convos }, { data: msgs }, { data: visions }, { data: signups }] =
    await Promise.all([
      admin.from("profiles").select("id, display_name, is_test, created_at, joined_from"),
      admin.from("conversations").select("id, user_id, kind, created_at"),
      admin.from("messages").select("conversation_id, role"),
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
  const realIds = new Set(real.map((p) => p.id));

  // Exchanges = what the person actually said. Prism's replies aren't progress.
  const userMsgsByConvo = new Map<string, number>();
  for (const m of msgs ?? []) {
    if (m.role !== "user") continue;
    userMsgsByConvo.set(m.conversation_id, (userMsgsByConvo.get(m.conversation_id) ?? 0) + 1);
  }

  // Furthest point reached per person.
  const deepestByUser = new Map<string, number>();
  const startedByUser = new Set<string>();
  for (const c of convos ?? []) {
    if (!realIds.has(c.user_id)) continue;
    startedByUser.add(c.user_id);
    const n = userMsgsByConvo.get(c.id) ?? 0;
    deepestByUser.set(c.user_id, Math.max(deepestByUser.get(c.user_id) ?? 0, n));
  }

  const visionByUser = new Map((visions ?? []).map((v) => [v.user_id, v]));
  const signedUp = new Set((signups ?? []).map((s) => s.user_id).filter(Boolean));

  const arrived = real.length;
  const started = startedByUser.size;
  const spoke = [...deepestByUser.values()].filter((n) => n >= 1).length;
  const wentDeep = [...deepestByUser.values()].filter((n) => n >= 4).length;
  const drafted = real.filter((p) => visionByUser.get(p.id)).length;
  const confirmed = real.filter((p) => visionByUser.get(p.id)?.status === "confirmed").length;
  const asked = real.filter((p) => signedUp.has(p.id)).length;

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
    count: [...deepestByUser.values()].filter((n) => n >= b.min && n <= b.max).length,
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

  const people = real
    .map((p) => {
      const v = visionByUser.get(p.id);
      const deepest = deepestByUser.get(p.id) ?? 0;
      return {
        name: p.display_name as string,
        joinedAt: p.created_at as string,
        city: joined(p).city ?? null,
        region: joined(p).region ?? null,
        device: joined(p).device ?? null,
        exchanges: deepest,
        furthest:
          v?.status === "confirmed"
            ? "confirmed a vision"
            : v
              ? "reached a draft"
              : deepest > 0
                ? "talked to Prism"
                : startedByUser.has(p.id)
                  ? "opened a conversation"
                  : "arrived only",
        askedForCall: signedUp.has(p.id),
      };
    })
    .sort((a, b) => (a.joinedAt < b.joinedAt ? 1 : -1));

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
    people,
    testExcluded: (profiles ?? []).length - real.length,
  });
}
