import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/lib/audit";

/**
 * Record a mastermind signup.
 *
 * Email only, and only ever at the end of a conversation — never as a gate at
 * the door. The opt-in is explicit and separate: saying "invite me to the call"
 * is not the same as saying "add me to a mailing list".
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { email, optIn } = await req.json();
  // Stored lowercased: the unique constraint is on the column itself, so
  // normalising here is what makes "A@x.com" and "a@x.com" one person.
  const address = typeof email === "string" ? email.trim().toLowerCase() : "";

  // Deliberately permissive: the job is to catch typos, not to adjudicate what
  // counts as a valid address.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
    return NextResponse.json({ error: "That doesn't look like an email address." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("mastermind_signups").upsert(
    {
      user_id: user?.id ?? null,
      email: address,
      mailing_list_opt_in: !!optIn,
    },
    { onConflict: "email" }
  );

  if (error) {
    // The table arrives with a migration; say so plainly rather than failing blank.
    const missing = error.message.includes("does not exist");
    return NextResponse.json(
      {
        error: missing
          ? "Signups aren't switched on yet — the mastermind list is still being set up."
          : error.message,
      },
      { status: missing ? 503 : 500 }
    );
  }

  // The address itself never enters the open record.
  await audit("mastermind.signup", "mastermind", null, user?.id ?? null, {
    mailing_list_opt_in: !!optIn,
  });

  return NextResponse.json({ ok: true });
}
