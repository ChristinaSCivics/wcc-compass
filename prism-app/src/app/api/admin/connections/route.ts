import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkKeeper } from "@/lib/keeper";

/**
 * Keeper-only: Connection Interview results.
 *
 * People who ticked "contact me" are listed in full, with their recap and the
 * choices they made. Everyone else is counted only — their skills, needs and
 * ways to help go into anonymous totals with no name attached, so the team can
 * see what kind of help is showing up without seeing who declined.
 */
export async function POST(req: NextRequest) {
  const { keeperPassword } = await req.json();
  if (!checkKeeper(keeperPassword)) {
    return NextResponse.json({ error: "keeper password required" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("connection_profiles")
    .select("user_id, confirmed, consents, contact, confirmed_at, profiles(is_test)")
    .eq("status", "confirmed")
    .order("confirmed_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const real = (data ?? []).filter(
    (r) => !(r.profiles as unknown as { is_test: boolean } | null)?.is_test
  );

  const totals: Record<string, Record<string, number>> = {
    skills: {},
    needs_matched: {},
    ways_to_participate: {},
    time_capacity: {},
  };
  for (const r of real) {
    const c = (r.confirmed ?? {}) as Record<string, unknown>;
    for (const key of ["skills", "needs_matched", "ways_to_participate"]) {
      const list = Array.isArray(c[key]) ? (c[key] as unknown[]) : [];
      for (const item of list) {
        if (typeof item !== "string" || !item) continue;
        totals[key][item] = (totals[key][item] ?? 0) + 1;
      }
    }
    if (typeof c.time_capacity === "string" && c.time_capacity) {
      totals.time_capacity[c.time_capacity] = (totals.time_capacity[c.time_capacity] ?? 0) + 1;
    }
  }

  const contacts = real
    .filter((r) => (r.consents as Record<string, boolean> | null)?.contact_me && r.contact)
    .map((r) => {
      const consents = r.consents as Record<string, boolean>;
      const c = { ...((r.confirmed ?? {}) as Record<string, unknown>) };
      // Only what they agreed to: organizations and referrals stay hidden unless ticked.
      if (!consents.note_my_organization) delete c.organizations;
      if (!consents.note_my_referrals) delete c.referrals;
      return {
        contact: r.contact,
        consents,
        recap: c,
        confirmedAt: r.confirmed_at,
      };
    });

  return NextResponse.json({ contacts, totals, completed: real.length });
}
