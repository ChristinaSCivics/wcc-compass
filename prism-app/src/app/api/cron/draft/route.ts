import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/lib/audit";
import { EXTRACTION_PROMPT } from "@/lib/prompts/onboarding";
import { EXTRACT_MODEL } from "@/lib/models";

export const maxDuration = 300;

/**
 * Draft the visions of people who walked away.
 *
 * The point of automatic drafting was never "draft often" — it was "don't lose
 * the work when someone stops". Doing that from the browser meant re-drafting
 * every few exchanges and guessing, badly, at when a conversation was over.
 * Abandonment is obvious from here: nothing said for a while.
 *
 * One call per person who left, instead of one per few things they said. Run
 * by a scheduled job; the Finish button remains the instant path.
 */

/** Long enough that someone thinking, or typing slowly, isn't mistaken for gone. */
const IDLE_MINUTES = 10;
/** Below this there isn't enough said to draft anything worth reviewing. */
const MIN_EXCHANGES = 2;
/** A ceiling, so one run can't turn into an unbounded bill. */
const MAX_PER_RUN = 25;

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not set" }, { status: 500 });
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const cutoff = Date.now() - IDLE_MINUTES * 60_000;

  const [{ data: convos }, { data: msgs }, { data: visions }] = await Promise.all([
    admin
      .from("conversations")
      .select("id, user_id, kind, prompt_version")
      .eq("kind", "onboarding"),
    admin.from("messages").select("conversation_id, role, content, created_at"),
    admin.from("vision_profiles").select("user_id, status, updated_at"),
  ]);

  const visionByUser = new Map((visions ?? []).map((v) => [v.user_id, v]));

  type Candidate = { id: string; userId: string; said: number; promptVersion: string | null };
  const candidates: Candidate[] = [];

  for (const c of convos ?? []) {
    const mine = (msgs ?? []).filter((m) => m.conversation_id === c.id);
    const said = mine.filter((m) => m.role === "user").length;
    if (said < MIN_EXCHANGES) continue;

    const lastAt = Math.max(...mine.map((m) => new Date(m.created_at).getTime()));
    if (lastAt > cutoff) continue; // still going

    const vision = visionByUser.get(c.user_id);
    // Never touch a vision someone has stood behind.
    if (vision?.status === "confirmed") continue;
    // Already drafted since they last spoke — nothing new to capture.
    if (vision && new Date(vision.updated_at).getTime() >= lastAt) continue;

    candidates.push({
      id: c.id,
      userId: c.user_id,
      said,
      promptVersion: (c.prompt_version as string | null) ?? null,
    });
  }

  const batch = candidates.slice(0, MAX_PER_RUN);
  const anthropic = new Anthropic();
  const drafted: string[] = [];
  const failed: string[] = [];

  for (const c of batch) {
    const transcript = (msgs ?? [])
      .filter((m) => m.conversation_id === c.id)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map((m) => `${m.role === "user" ? "MEMBER" : "PRISM"}: ${m.content}`)
      .join("\n\n");

    try {
      const res = await anthropic.messages.create({
        model: EXTRACT_MODEL,
        max_tokens: 4096,
        system: EXTRACTION_PROMPT,
        messages: [
          {
            role: "user",
            // Spelled out because on a short transcript the model otherwise
            // continues the conversation instead of answering with the draft.
            content:
              `Interview transcript:\n\n${transcript}\n\n` +
              `Respond with the JSON object only. Begin your reply with { and end it with }. ` +
              `Do not restate the transcript.`,
          },
        ],
      });
      const raw = res.content[0].type === "text" ? res.content[0].text : "";
      const json = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
      const draft = JSON.parse(json);

      const { error } = await admin.from("vision_profiles").upsert(
        {
          user_id: c.userId,
          draft,
          status: "draft",
          updated_at: new Date().toISOString(),
          prompt_version: c.promptVersion,
        },
        { onConflict: "user_id" }
      );
      if (error) throw new Error(error.message);

      await audit("vision.drafted", "vision_profile", c.userId, null, {
        via: "cron_abandoned",
        said: c.said,
      });
      drafted.push(c.id);
    } catch {
      failed.push(c.id);
    }
  }

  return NextResponse.json({
    ok: true,
    considered: candidates.length,
    drafted: drafted.length,
    failed: failed.length,
    deferred: Math.max(0, candidates.length - batch.length),
  });
}
