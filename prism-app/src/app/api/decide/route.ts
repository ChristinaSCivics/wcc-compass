import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/lib/audit";

/**
 * Record the group's ratified outcome. Prism proposed; humans decided.
 * The outcome + rationale becomes part of the permanent, hash-chained record.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["facilitator", "admin"].includes(profile.role)) {
    return NextResponse.json({ error: "facilitators only" }, { status: 403 });
  }

  const { decisionId, chosenOption, rationale } = await req.json();
  const outcome = { chosen_option: chosenOption, rationale, ratified_by_group: true };

  const admin = createAdminClient();
  const { error } = await admin
    .from("decisions")
    .update({ outcome, status: "decided", decided_at: new Date().toISOString() })
    .eq("id", decisionId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await audit("decision.ratified", "decision", decisionId, user.id, outcome);
  return NextResponse.json({ ok: true });
}
