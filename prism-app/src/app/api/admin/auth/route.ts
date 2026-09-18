import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkKeeper } from "@/lib/keeper";

/**
 * Check the keeper password, and nothing else.
 *
 * Exists so /admin can sign you in once rather than every tool asking
 * separately — and so a wrong password is answered immediately instead of
 * after a page has tried and failed to load its data.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { keeperPassword } = await req.json();
  if (!checkKeeper(keeperPassword)) {
    return NextResponse.json({ error: "wrong password" }, { status: 403 });
  }
  return NextResponse.json({ ok: true });
}
