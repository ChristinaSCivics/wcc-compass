import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/lib/audit";
import { checkKeeper } from "@/lib/keeper";

/**
 * Record the group's ratified outcome. Prism proposed; humans decided.
 * Keeper-password gated; the recording person's name goes on the permanent record.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { decisionId, chosenOption, rationale, keeperPassword } = await req.json();
  if (!checkKeeper(keeperPassword)) {
    return NextResponse.json({ error: "keeper password required" }, { status: 403 });
  }

  const { data: profile } = await supabase
    .from("profiles").select("display_name").eq("id", user.id).single();

  const outcome = {
    chosen_option: chosenOption,
    rationale,
    ratified_by_group: true,
    recorded_by: profile?.display_name ?? "unknown",
  };

  const admin = createAdminClient();
  const { error } = await admin
    .from("decisions")
    .update({ outcome, status: "decided", decided_at: new Date().toISOString() })
    .eq("id", decisionId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await audit("decision.ratified", "decision", decisionId, user.id, {
    ...outcome,
    via: "keeper_password",
  });
  return NextResponse.json({ ok: true });
}
