import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkKeeper } from "@/lib/keeper";
import { placeOf } from "@/lib/places";

/**
 * Keeper-only: who we can actually reach.
 *
 * Three different things were being conflated. Someone who entered with only a
 * name is reachable by nothing at all — if they close the tab, they're gone.
 * Someone who saved their spot gave an email so they could come back. Someone
 * in the mastermind gave an email for a call, which is a different promise and
 * lives in its own table. This answers all three in one place, because the
 * question in the room is always "who do we have, and who did we lose".
 *
 * Emails are the point of the page, so they're returned in full — this is the
 * one keeper view where that's true, and it's gated on the keeper password
 * like the rest.
 */
export async function POST(req: NextRequest) {
  const { keeperPassword } = await req.json();
  if (!checkKeeper(keeperPassword)) {
    return NextResponse.json({ error: "keeper password required" }, { status: 403 });
  }

  const admin = createAdminClient();
  const [{ data: profiles }, { data: signups }, { data: visions }] = await Promise.all([
    admin
      .from("profiles")
      .select("id, display_name, email, is_test, created_at, joined_from")
      .order("created_at", { ascending: false }),
    admin
      .from("mastermind_signups")
      .select("user_id, email, mailing_list_opt_in, created_at")
      .order("created_at", { ascending: false }),
    admin.from("vision_profiles").select("user_id, status"),
  ]);

  const signupBy = new Map((signups ?? []).map((s) => [s.user_id as string, s]));
  const visionBy = new Map((visions ?? []).map((v) => [v.user_id as string, v.status as string]));

  const people = (profiles ?? [])
    .filter((p) => !p.is_test)
    .map((p) => {
      const signup = signupBy.get(p.id);
      return {
        id: p.id,
        name: p.display_name ?? "unnamed",
        // The email on the profile is the saved spot; the one on the signup is
        // what they gave for the call. Usually the same, occasionally not, and
        // when they differ both are worth seeing.
        savedEmail: (p.email as string | null) ?? null,
        mastermindEmail: (signup?.email as string | null) ?? null,
        mailingList: !!signup?.mailing_list_opt_in,
        signedUpAt: (signup?.created_at as string | null) ?? null,
        joinedAt: p.created_at,
        place: placeOf(p.joined_from),
        visionStatus: visionBy.get(p.id) ?? "none",
      };
    });

  // A signup whose profile is a test account, or whose profile is gone, would
  // otherwise vanish from the count of people expecting a call.
  const accounted = new Set(people.filter((p) => p.mastermindEmail).map((p) => p.id));
  const orphanSignups = (signups ?? [])
    .filter((s) => !accounted.has(s.user_id as string))
    .map((s) => ({
      email: s.email as string,
      mailingList: !!s.mailing_list_opt_in,
      signedUpAt: s.created_at as string,
    }));

  return NextResponse.json({
    people,
    orphanSignups,
    setAside: (profiles ?? []).filter((p) => p.is_test).length,
  });
}
