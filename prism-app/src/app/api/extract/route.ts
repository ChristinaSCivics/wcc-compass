import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { audit } from "@/lib/audit";
import { EXTRACTION_PROMPT } from "@/lib/prompts/onboarding";
import { DECISION_INPUT_EXTRACTION_PROMPT } from "@/lib/prompts/decision";

export const maxDuration = 120;

const MODEL = process.env.PRISM_MODEL || "claude-sonnet-4-6";

/**
 * Second pass: extract a structured DRAFT from a completed conversation.
 * The draft is not ground truth — the member edits and confirms it.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { conversationId } = await req.json();

  const { data: conversation } = await supabase
    .from("conversations").select("*").eq("id", conversationId).single();
  if (!conversation) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { data: history } = await supabase
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (!history?.length) return NextResponse.json({ error: "empty conversation" }, { status: 400 });

  const transcript = history
    .map((m) => `${m.role === "user" ? "MEMBER" : "PRISM"}: ${m.content}`)
    .join("\n\n");

  const isDecision = conversation.kind === "decision";
  const anthropic = new Anthropic();
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: isDecision ? DECISION_INPUT_EXTRACTION_PROMPT : EXTRACTION_PROMPT,
    messages: [{ role: "user", content: `Interview transcript:\n\n${transcript}` }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  let draft: unknown;
  try {
    draft = JSON.parse(text.replace(/^```(?:json)?\s*/,"").replace(/\s*```$/,""));
  } catch {
    return NextResponse.json({ error: "extraction did not return valid JSON" }, { status: 502 });
  }

  if (isDecision) {
    const { error } = await supabase.from("decision_inputs").upsert(
      {
        decision_id: conversation.decision_id,
        user_id: user.id,
        conversation_id: conversationId,
        needs: draft,
        confirmed: false,
        prompt_version: conversation.prompt_version,
      },
      { onConflict: "decision_id,user_id" }
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await audit("decision_input.drafted", "decision", conversation.decision_id, user.id, {});
  } else {
    const { error } = await supabase.from("vision_profiles").upsert(
      {
        user_id: user.id,
        draft,
        status: "draft",
        updated_at: new Date().toISOString(),
        prompt_version: conversation.prompt_version,
      },
      { onConflict: "user_id" }
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await audit("vision.drafted", "vision_profile", user.id, user.id, {});
  }

  await supabase.from("conversations")
    .update({ status: "completed" }).eq("id", conversationId);

  return NextResponse.json({ draft });
}
