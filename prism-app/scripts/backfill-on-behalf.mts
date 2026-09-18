/**
 * One-off: draft a vision from an existing conversation and place it on the map
 * on that person's behalf.
 *
 * Three people gave long, real conversations in July and never reached a draft,
 * because the only way out was a button they never found. Their words sat in
 * the messages table and nowhere else. This recovers them.
 *
 * It does NOT pretend they confirmed it. `confirmed_by` records the keeper who
 * placed it, every surface that shows a vision checks that column, and the
 * person is asked to review and make it theirs when they return.
 *
 * Run: npx tsx scripts/backfill-on-behalf.mts [--apply]
 * Without --apply it prints what it would do and writes nothing.
 */
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { EXTRACTION_PROMPT } from "../src/lib/prompts/onboarding";

const ONLY = process.argv.find((a) => a.startsWith("--only="))?.slice(7);
const NAMES = ONLY ? [ONLY] : ["Alieona Riley", "Alexandår", "Laura"];
/** Christina — the keeper placing these. */
const KEEPER = "60448a0e-6d00-4702-88a1-e63e4bd2ceb5";
const APPLY = process.argv.includes("--apply");

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const anthropic = new Anthropic();
const MODEL = process.env.PRISM_MODEL || "claude-sonnet-4-6";

const { data: profiles } = await db
  .from("profiles")
  .select("id, display_name, is_test")
  .in("display_name", NAMES);

const { data: convos } = await db.from("conversations").select("id, user_id, kind");
const { data: msgs } = await db
  .from("messages")
  .select("conversation_id, role, content, created_at")
  .order("created_at", { ascending: true });
const { data: existing } = await db.from("vision_profiles").select("user_id, status");
const hasVision = new Set((existing ?? []).map((v) => v.user_id));

for (const name of NAMES) {
  const accounts = (profiles ?? []).filter((p) => p.display_name === name && !p.is_test);

  // Their richest conversation across every account they ended up with.
  let best: { convoId: string; userId: string; said: number } | null = null;
  for (const a of accounts) {
    for (const c of (convos ?? []).filter((c) => c.user_id === a.id && c.kind === "onboarding")) {
      const said = (msgs ?? []).filter((m) => m.conversation_id === c.id && m.role === "user").length;
      if (!best || said > best.said) best = { convoId: c.id, userId: a.id, said };
    }
  }

  if (!best || best.said === 0) {
    console.log(`${name}: nothing said in any conversation — skipping`);
    continue;
  }
  if (hasVision.has(best.userId)) {
    console.log(`${name}: already has a vision record — skipping`);
    continue;
  }

  const transcript = (msgs ?? [])
    .filter((m) => m.conversation_id === best!.convoId)
    .map((m) => `${m.role === "user" ? "MEMBER" : "PRISM"}: ${m.content}`)
    .join("\n\n");

  console.log(`${name}: ${best.said} messages, ${transcript.length} chars of transcript`);
  if (!APPLY) continue;

  const res = await anthropic.messages.create({
    model: MODEL,
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
  // Take the outermost JSON object, in case anything is said around it.
  const text = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
  let draft: unknown;
  try {
    draft = JSON.parse(text.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, ""));
  } catch {
    console.log(`  ! extraction returned invalid JSON — skipped`);
    console.log(`  --- model said: ${text.slice(0, 300)}`);
    continue;
  }

  const now = new Date().toISOString();
  const { error } = await db.from("vision_profiles").upsert(
    {
      user_id: best.userId,
      draft,
      confirmed: draft,
      status: "confirmed",
      confirmed_at: now,
      confirmed_by: KEEPER,
      updated_at: now,
    },
    { onConflict: "user_id" }
  );
  if (error) {
    console.log(`  ! ${error.message}`);
    continue;
  }

  await db.from("audit_log").insert({
    event_type: "vision.confirmed_on_behalf",
    entity_type: "vision_profile",
    entity_id: best.userId,
    actor: KEEPER,
    payload: { for_name: name, from_conversation: best.convoId, said: best.said },
    prev_hash: "",
    hash: "",
  });
  console.log(`  ✓ placed on the map on their behalf, pending their review`);
}
