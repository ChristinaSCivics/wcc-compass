import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/lib/audit";
import { checkKeeper } from "@/lib/keeper";

/** Open a new decision for the circle. Keeper-password gated; actor logged by name. */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { title, description, keeperPassword } = await req.json();
  if (!checkKeeper(keeperPassword)) {
    return NextResponse.json({ error: "keeper password required" }, { status: 403 });
  }
  if (!title?.trim()) return NextResponse.json({ error: "title required" }, { status: 400 });

  const { data: profile } = await supabase
    .from("profiles").select("display_name").eq("id", user.id).single();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("decisions")
    .insert({ title, description, created_by: user.id })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await audit("decision.opened", "decision", data.id, user.id, {
    title,
    by_name: profile?.display_name ?? "unknown",
    via: "keeper_password",
  });
  return NextResponse.json(data);
}
