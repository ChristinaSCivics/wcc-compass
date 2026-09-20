import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkKeeper } from "@/lib/keeper";
import { PRISM_MODEL, EXTRACT_MODEL } from "@/lib/models";

/**
 * What the machinery is doing: which models run which job, how often each has
 * been called, and when the scheduled drafting last did something.
 *
 * Call counts come from records the app already keeps — an assistant message
 * is one conversation call, and drafts, weaves and syntheses each leave an
 * audit entry. Token usage is NOT recorded anywhere, so this can count calls
 * honestly but cannot price them; the page says so rather than inventing a
 * number.
 */
export async function POST(req: NextRequest) {
  const { keeperPassword } = await req.json();
  if (!checkKeeper(keeperPassword)) {
    return NextResponse.json({ error: "keeper password required" }, { status: 403 });
  }

  const admin = createAdminClient();
  const [{ count: assistantMsgs }, { data: events }, { count: conversations }] =
    await Promise.all([
      admin
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("role", "assistant"),
      admin
        .from("audit_log")
        .select("event_type, payload, created_at")
        .order("created_at", { ascending: false })
        .limit(1000),
      admin.from("conversations").select("id", { count: "exact", head: true }),
    ]);

  const rows = events ?? [];
  const countOf = (type: string) => rows.filter((e) => e.event_type === type).length;

  const cronDrafts = rows.filter(
    (e) =>
      e.event_type === "vision.drafted" &&
      (e.payload as { via?: string } | null)?.via === "cron_abandoned"
  );
  const lastCron = cronDrafts[0]?.created_at ?? null;

  const autoWeaves = rows.filter(
    (e) =>
      e.event_type === "collective.woven" &&
      (e.payload as { via?: string } | null)?.via === "auto_stale"
  );

  return NextResponse.json({
    models: {
      conversation: PRISM_MODEL,
      extraction: EXTRACT_MODEL,
    },
    calls: {
      conversationTurns: assistantMsgs ?? 0,
      visionDrafts: countOf("vision.drafted"),
      decisionDrafts: countOf("decision_input.drafted"),
      weaves: countOf("collective.woven"),
      syntheses: countOf("decision.synthesized"),
    },
    conversations: conversations ?? 0,
    cron: {
      lastDraftRun: lastCron,
      draftsFromCron: cronDrafts.length,
      autoWeaves: autoWeaves.length,
    },
    // The audit log only goes back to when auditing shipped, so counts before
    // that are simply absent rather than zero.
    auditWindowFrom: rows.length ? rows[rows.length - 1].created_at : null,
    auditTruncated: rows.length >= 1000,
  });
}
