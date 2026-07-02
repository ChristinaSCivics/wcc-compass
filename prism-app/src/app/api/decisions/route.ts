import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/lib/audit";

/** Facilitators/admins open a new decision for the circle. */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["facilitator", "admin"].includes(profile.role)) {
    return NextResponse.json({ error: "facilitators only" }, { status: 403 });
  }

  const { title, description } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: "title required" }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("decisions")
    .insert({ title, description, created_by: user.id })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await audit("decision.opened", "decision", data.id, user.id, { title });
  return NextResponse.json(data);
}
