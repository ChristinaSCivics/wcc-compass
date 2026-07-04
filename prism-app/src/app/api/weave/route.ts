import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/lib/audit";
import { checkKeeper } from "@/lib/keeper";
import { WEAVE_PROMPT } from "@/lib/prompts/collective";

export const maxDuration = 300;

const MODEL = process.env.PRISM_MODEL || "claude-sonnet-4-6";

/** Weave all confirmed visions into the collective map. Keeper-gated. */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { keeperPassword } = await req.json();
  if (!checkKeeper(keeperPassword)) {
    return NextResponse.json({ error: "keeper password required" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: visions } = await admin
    .from("vision_profiles")
    .select("confirmed, profiles(display_name)")
    .eq("status", "confirmed");

  if (!visions?.length) {
    return NextResponse.json({ error: "no confirmed visions on the map yet" }, { status: 400 });
  }

  const block = visions
    .map((v) => {
      const p = v.profiles as unknown as { display_name: string } | null;
      return `### ${p?.display_name ?? "member"}\n${JSON.stringify(v.confirmed, null, 2)}`;
    })
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
    via: "keeper_password",
  });

  return NextResponse.json({ ok: true });
}
