import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { audit } from "@/lib/audit";
import { promptVersion } from "@/lib/prompts/version";
import { ONBOARDING_PROMPT } from "@/lib/prompts/onboarding";
import { decisionInterviewPrompt } from "@/lib/prompts/decision";

/** Create a conversation (onboarding, or decision interview). */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { kind, decisionId } = await req.json();
  if (!["onboarding", "decision"].includes(kind)) {
    return NextResponse.json({ error: "invalid kind" }, { status: 400 });
  }

  // stamp which version of the questions this conversation runs under
  let version = promptVersion(ONBOARDING_PROMPT);
  if (kind === "decision" && decisionId) {
    const { data: decision } = await supabase
      .from("decisions").select("title, description").eq("id", decisionId).single();
    if (!decision) return NextResponse.json({ error: "decision not found" }, { status: 404 });
    version = promptVersion(decisionInterviewPrompt(decision.title, decision.description ?? ""));
  }

  const { data, error } = await supabase
    .from("conversations")
    .insert({ user_id: user.id, kind, decision_id: decisionId ?? null, prompt_version: version })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await audit("conversation.started", "conversation", data.id, user.id, { kind });
  return NextResponse.json(data);
}
