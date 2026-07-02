import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { audit } from "@/lib/audit";

/**
 * The member confirms (possibly after editing) their extracted draft.
 * Only confirmed records participate in synthesis — human-validated ground truth.
 * Confirmation is written to the tamper-evident audit chain with a content hash.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { type, content, decisionId } = await req.json();

  if (type === "vision") {
    const { error } = await supabase.from("vision_profiles").upsert(
      {
        user_id: user.id,
        confirmed: content,
        status: "confirmed",
        confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await audit("vision.confirmed", "vision_profile", user.id, user.id, {
      content_sha256: await sha256(JSON.stringify(content)),
    });
  } else if (type === "decision_input") {
    const { error } = await supabase
      .from("decision_inputs")
      .update({ needs: content, confirmed: true })
      .eq("decision_id", decisionId)
      .eq("user_id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await audit("decision_input.confirmed", "decision", decisionId, user.id, {
      content_sha256: await sha256(JSON.stringify(content)),
    });
  } else {
    return NextResponse.json({ error: "invalid type" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
