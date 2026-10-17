import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { ONBOARDING_PROMPT } from "@/lib/prompts/onboarding";
import { decisionInterviewPrompt } from "@/lib/prompts/decision";
import { connectionPrompt } from "@/lib/prompts/connection";

export const maxDuration = 120;

const MODEL = process.env.PRISM_MODEL || "claude-sonnet-4-6";

/**
 * Streaming chat with PRiSM.
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

  let system = ONBOARDING_PROMPT;
  if (conversation.kind === "decision" && conversation.decisions) {
    system = decisionInterviewPrompt(conversation.decisions.title, conversation.decisions.description ?? "");
  } else if (conversation.kind === "connection") {
    system = connectionPrompt(await visionBackground(supabase, user.id));
  }

  const anthropic = new Anthropic();
  const stream = anthropic.messages.stream({
    model: MODEL,
    // a ceiling, not an allocation — 2048 risked cutting a long reply mid-sentence,
    // which reads as PRiSM stalling
    max_tokens: 8192,
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
      } catch (e) {
        // A model/network failure mid-stream used to reject the response body,
        // which the browser saw as a broken read. Finish the turn with a
        // readable sentence instead, and keep whatever streamed so far.
        console.error("chat stream failed:", e);
        const note =
          full.length > 0
            ? "\n\n— PRiSM lost the thread there. Ask again and it'll continue."
            : "PRiSM couldn't reach the model just then. Please try again.";
        full += note;
        try {
          controller.enqueue(encoder.encode(note));
        } catch {
          // the client already hung up; nothing to send
        }
      } finally {
        // persist PRiSM's reply once complete
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

/**
 * A few lines of the person's Basic Map, so the Connection Interview doesn't ask
 * again what they've already said. Only fields about who they are and what they
 * give — never the rest of their vision.
 */
async function visionBackground(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("vision_profiles").select("draft, confirmed, status").eq("user_id", userId).maybeSingle();
  const v = (data?.status === "confirmed" ? data.confirmed : data?.draft) as Record<string, unknown> | null;
  if (!v) return null;
  const pick = ["headline", "work_and_contribution", "gifts", "capacity"]
    .filter((k) => v[k] != null && v[k] !== "" && !(Array.isArray(v[k]) && !(v[k] as unknown[]).length))
    .map((k) => `- ${k.replace(/_/g, " ")}: ${typeof v[k] === "string" ? v[k] : JSON.stringify(v[k])}`);
  return pick.length ? pick.join("\n") : null;
}
