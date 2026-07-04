import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkKeeper } from "@/lib/keeper";

/** Keeper-only: read all feedback with names and pages. */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { keeperPassword } = await req.json();
  if (!checkKeeper(keeperPassword)) {
    return NextResponse.json({ error: "keeper password required" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("feedback")
    .select("id, message, page, created_at, profiles(display_name)")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    items: (data ?? []).map((f) => ({
      id: f.id,
      message: f.message,
      page: f.page,
      created_at: f.created_at,
      name: (f.profiles as unknown as { display_name: string } | null)?.display_name ?? "unknown",
    })),
  });
}
