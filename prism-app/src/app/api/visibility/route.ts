import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { audit } from "@/lib/audit";

/**
 * A confirmed member toggles whether their individual answer is visible to
 * other members. Default is visible; this only ever touches the caller's own
 * row. Hiding never removes input from the collective weave/synthesis — it
 * only hides the individual, named entry from other members' view.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { type, decisionId, hidden } = await req.json();
  if (typeof hidden !== "boolean") {
    return NextResponse.json({ error: "hidden must be a boolean" }, { status: 400 });
  }

  if (type === "vision") {
    const { error } = await supabase
      .from("vision_profiles")
      .update({ hidden })
      .eq("user_id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await audit("vision.visibility_changed", "vision_profile", user.id, user.id, { hidden });
  } else if (type === "decision_input") {
    const { error } = await supabase
      .from("decision_inputs")
      .update({ hidden })
      .eq("decision_id", decisionId)
      .eq("user_id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await audit("decision_input.visibility_changed", "decision", decisionId, user.id, { hidden });
  } else {
    return NextResponse.json({ error: "invalid type" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
