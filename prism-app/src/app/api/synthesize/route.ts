import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/lib/audit";
import { checkKeeper } from "@/lib/keeper";
import { synthesisPrompt } from "@/lib/prompts/decision";

export const maxDuration = 300;

const MODEL = process.env.PRISM_MODEL || "claude-sonnet-4-6";

/**
 * Run Prism synthesis across ALL confirmed stakeholder inputs for a decision.
 * Facilitator/admin action. Prism proposes; the group ratifies on the decision page.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { decisionId, keeperPassword } = await req.json();
  if (!checkKeeper(keeperPassword)) {
    return NextResponse.json({ error: "keeper password required" }, { status: 403 });
  }

  const { data: profile } = await supabase
    .from("profiles").select("display_name").eq("id", user.id).single();
  const admin = createAdminClient();

  const { data: decision } = await admin
    .from("decisions").select("*").eq("id", decisionId).single();
  if (!decision) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { data: inputs } = await admin
    .from("decision_inputs")
    .select("needs, confirmed, profiles(display_name)")
    .eq("decision_id", decisionId)
    .eq("confirmed", true);
  if (!inputs?.length) {
    return NextResponse.json({ error: "no confirmed stakeholder inputs yet" }, { status: 400 });
  }

  const inputBlock = inputs
    .map((i) => {
      const p = i.profiles as unknown as { display_name: string } | null;
      return `### Stakeholder: ${p?.display_name ?? "unknown"}\n${JSON.stringify(i.needs, null, 2)}`;
    })
    .join("\n\n");

  const anthropic = new Anthropic();
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8192,
    system: synthesisPrompt(decision.title),
    messages: [{ role: "user", content: `Confirmed stakeholder inputs:\n\n${inputBlock}` }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  let synthesis: unknown;
  try {
    synthesis = JSON.parse(text.replace(/^```(?:json)?\s*/,"").replace(/\s*```$/,""));
  } catch {
    return NextResponse.json({ error: "synthesis did not return valid JSON" }, { status: 502 });
  }

  await admin.from("decisions")
    .update({ synthesis, status: "review" })
    .eq("id", decisionId);

  await audit("decision.synthesized", "decision", decisionId, user.id, {
    model: MODEL,
    stakeholder_count: inputs.length,
    by_name: profile?.display_name ?? "unknown",
    via: "keeper_password",
  });

  return NextResponse.json({ synthesis });
}
