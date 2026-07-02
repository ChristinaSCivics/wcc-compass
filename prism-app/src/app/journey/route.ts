import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { audit } from "@/lib/audit";

/** Start (or resume) the onboarding conversation, then land in the chat. */
export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login`);

  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("user_id", user.id).eq("kind", "onboarding").eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1);
  if (existing?.length) {
    return NextResponse.redirect(`${origin}/chat/${existing[0].id}`);
  }

  const { data: convo, error } = await supabase
    .from("conversations")
    .insert({ user_id: user.id, kind: "onboarding" })
    .select()
    .single();
  if (error) return NextResponse.redirect(`${origin}/dashboard`);

  await audit("conversation.started", "conversation", convo.id, user.id, { kind: "onboarding" });
  return NextResponse.redirect(`${origin}/chat/${convo.id}`);
}
