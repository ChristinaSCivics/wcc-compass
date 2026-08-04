import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkKeeper } from "@/lib/keeper";
import { audit } from "@/lib/audit";

/**
 * Keeper-only member roster: who is here, how far they've come, and which
 * identities are sandboxes. POST lists; PATCH flags an account as test or real.
 *
 * Counts are assembled in memory rather than in SQL — at circle scale that's a
 * handful of rows, and it keeps this readable without a view or an RPC.
 */

type Row = { user_id: string };

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { keeperPassword } = await req.json();
  if (!checkKeeper(keeperPassword)) {
    return NextResponse.json({ error: "keeper password required" }, { status: 403 });
  }

  const admin = createAdminClient();
  const [{ data: profiles }, { data: visions }, { data: inputs }, { data: convos }] =
    await Promise.all([
      admin
        .from("profiles")
        .select("id, display_name, email, role, is_test, created_at, joined_from")
        .order("created_at", { ascending: true }),
      admin.from("vision_profiles").select("user_id, status, hidden, confirmed_at"),
      admin.from("decision_inputs").select("user_id, confirmed"),
      admin.from("conversations").select("user_id, kind, status, created_at"),
    ]);

  const countBy = (rows: Row[] | null, id: string) =>
    (rows ?? []).filter((r) => r.user_id === id).length;

  const members = (profiles ?? []).map((p) => {
    const vision = (visions ?? []).find((v) => v.user_id === p.id);
    const mine = (convos ?? []).filter((c) => c.user_id === p.id);
    const lastActive = mine
      .map((c) => c.created_at)
      .sort()
      .at(-1) ?? null;
    return {
      id: p.id,
      name: p.display_name ?? "unnamed",
      // anonymous identities have no email; a saved spot does
      saved: !!p.email,
      role: p.role,
      isTest: p.is_test,
      joinedAt: p.created_at,
      joinedFrom: p.joined_from ?? null,
      visionStatus: vision?.status ?? "none",
      visionHidden: !!vision?.hidden,
      confirmedInputs: (inputs ?? []).filter((i) => i.user_id === p.id && i.confirmed).length,
      conversations: countBy(convos as Row[] | null, p.id),
      lastActive,
    };
  });

  return NextResponse.json({ members });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { keeperPassword, userId, isTest } = await req.json();
  if (!checkKeeper(keeperPassword)) {
    return NextResponse.json({ error: "keeper password required" }, { status: 403 });
  }
  if (typeof userId !== "string" || typeof isTest !== "boolean") {
    return NextResponse.json({ error: "userId and isTest are required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: actor } = await admin
    .from("profiles").select("display_name").eq("id", user.id).single();

  const { error } = await admin.from("profiles").update({ is_test: isTest }).eq("id", userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // the shared keeper password hides nothing about WHO acted
  await audit("profile.test_flag_changed", "profile", userId, user.id, {
    is_test: isTest,
    by_name: actor?.display_name ?? "unknown",
    via: "keeper_password",
  });

  return NextResponse.json({ ok: true });
}
