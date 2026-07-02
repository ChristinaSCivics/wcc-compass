import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { ONBOARDING_PROMPT } from "@/lib/prompts/onboarding";
import { decisionInterviewPrompt } from "@/lib/prompts/decision";

export const maxDuration = 120;

const MODEL = process.env.PRISM_MODEL || "claude-sonnet-4-6";

/**
 * Streaming chat with Prism.
 * Persists the user message before calling the model and the assistant
 * message after the stream completes — the transcript is the durable asset.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("unauthorized", { status: 401 });

  const { conversationId, message } = await req.json();

  // conversation must belong to the user (RLS enforces, but check for a clean 404)
  const { data: conversation } = await supabase
    .from("conversations")
    .select("*, decisions(title, description)")
    .eq("id", conversationId)
    .single();
  if (!conversation) return new Response("conversation not found", { status: 404 });

  const { data: profile } = await supabase
    .from("profiles").select("display_name").eq("id", user.id).single();

  // persist the user message first — never lose input
  await supabase.from("messages").insert({
    conversation_id: conversationId, role: "user", content: message,
  });

  const { data: history } = await supabase
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  const system =
    conversation.kind === "decision" && conversation.decisions
      ? decisionInterviewPrompt(conversation.decisions.title, conversation.decisions.description ?? "")
      : ONBOARDING_PROMPT;

  const anthropic = new Anthropic();
  const stream = anthropic.messages.stream({
    model: MODEL,
    max_tokens: 2048,
    system: `${system}\n\nThe member you are speaking with is named: ${profile?.display_name ?? "unknown — ask them"}.`,
    messages: (history ?? []).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  });

  const encoder = new TextEncoder();
  let full = "";

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            full += event.delta.text;
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } finally {
        // persist Prism's reply once complete
        if (full.length > 0) {
          await supabase.from("messages").insert({
            conversation_id: conversationId, role: "assistant", content: full,
          });
          await supabase
            .from("conversations")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", conversationId);
        }
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
