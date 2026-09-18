import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/lib/audit";
import { checkKeeper } from "@/lib/keeper";
import { WEAVE_PROMPT } from "@/lib/prompts/collective";
import { scrubNames } from "@/lib/anonymize";

export const maxDuration = 300;

const MODEL = process.env.PRISM_MODEL || "claude-sonnet-4-6";

/** Weave all confirmed visions into the collective map. Keeper-gated. */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { keeperPassword, auto } = await req.json();

  // Two ways in. A keeper can weave on demand with the password, or the
  // collective page can ask for one when the map has moved on since the last
  // weaving. The automatic path is rate limited so a busy day at a convention
  // batches up instead of paying for a weave per confirmation.
  const AUTO_MIN_GAP_MS = 30 * 60 * 1000;
  if (!auto && !checkKeeper(keeperPassword)) {
    return NextResponse.json({ error: "keeper password required" }, { status: 403 });
  }

  const admin = createAdminClient();

  // The automatic path is not a way around the password — it is only allowed to
  // do something a keeper would have done anyway, and only when it is actually
  // needed. It refuses if nothing has been confirmed since the last weaving, or
  // if one ran recently, so a busy convention batches up instead of paying for
  // a weave per visitor.
  if (auto) {
    const [{ data: lastWeave }, { data: newest }] = await Promise.all([
      admin
        .from("collective_syntheses")
        .select("created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin
        .from("vision_profiles")
        .select("confirmed_at")
        .eq("status", "confirmed")
        .order("confirmed_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const wovenAt = lastWeave?.created_at ? new Date(lastWeave.created_at).getTime() : 0;
    const confirmedAt = newest?.confirmed_at ? new Date(newest.confirmed_at).getTime() : 0;

    if (confirmedAt <= wovenAt) {
      return NextResponse.json({ ok: true, skipped: "nothing new since the last weaving" });
    }
    if (Date.now() - wovenAt < AUTO_MIN_GAP_MS) {
      return NextResponse.json({ ok: true, skipped: "woven recently" });
    }
  }

  // !inner + is_test=false keeps sandbox identities out of the collective picture
  const { data: visions } = await admin
    .from("vision_profiles")
    .select("confirmed, profiles!vision_profiles_user_id_fkey!inner(display_name, is_test)")
    .eq("status", "confirmed")
    .eq("profiles.is_test", false);

  // The roster, used only to scrub names back out of the weave (below).
  const { data: roster } = await admin.from("profiles").select("display_name");
  const names = (roster ?? []).map((p) => p.display_name as string | null);

  if (!visions?.length) {
    return NextResponse.json({ error: "no confirmed visions on the map yet" }, { status: 400 });
  }

  // Positional labels only. Note this is NOT sufficient on its own: names also
  // occur inside the vision text people wrote, so the output is scrubbed below.
  const block = visions
    .map((v, i) => `### Voice ${i + 1}\n${JSON.stringify(v.confirmed, null, 2)}`)
    .join("\n\n");

  const anthropic = new Anthropic();
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8192,
    system: WEAVE_PROMPT,
    messages: [{ role: "user", content: `Confirmed visions on the map:\n\n${block}` }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  let content: unknown;
  try {
    content = JSON.parse(text.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, ""));
  } catch {
    return NextResponse.json({ error: "weave did not return valid JSON" }, { status: 502 });
  }

  // Backstop for the prompt's no-names rule — an instruction is not enforcement.
  content = scrubNames(content, names);

  const { error } = await admin
    .from("collective_syntheses")
    .insert({ content, member_count: visions.length, created_by: user.id });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: profile } = await supabase
    .from("profiles").select("display_name").eq("id", user.id).single();
  await audit("collective.woven", "collective_synthesis", null, user.id, {
    member_count: visions.length,
    model: MODEL,
    by_name: profile?.display_name ?? "unknown",
    via: auto ? "auto_stale" : "keeper_password",
  });

  return NextResponse.json({ ok: true });
}
