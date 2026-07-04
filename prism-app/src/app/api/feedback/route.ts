import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { message, page } = await req.json();
  if (!message?.trim()) return NextResponse.json({ error: "empty" }, { status: 400 });

  const { error } = await supabase.from("feedback").insert({
    user_id: user.id,
    message: message.trim().slice(0, 4000),
    page: typeof page === "string" ? page.slice(0, 200) : null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
