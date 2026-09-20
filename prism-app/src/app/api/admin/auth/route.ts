import { NextRequest, NextResponse } from "next/server";
import { checkKeeper } from "@/lib/keeper";
import { audit } from "@/lib/audit";
import { placeOf } from "@/lib/places";

/**
 * Check the keeper password, and write down that it happened.
 *
 * Exists so /admin can sign you in once rather than every tool asking
 * separately — and so a wrong password is answered immediately instead of
 * after a page has tried and failed to load its data.
 *
 * Both outcomes are recorded. One password is shared between three people, so
 * "who has been in here" is a question the record should be able to answer,
 * and a run of failures is the only warning we'd get that the password has
 * escaped. The name is the one picked at the door: a signature, not proof, and
 * the record says so. The password itself is never written anywhere, not even
 * a wrong one.
 */
function whereFrom(req: NextRequest) {
  const h = req.headers;
  const ua = h.get("user-agent") ?? "";
  return {
    place: placeOf({
      country: h.get("x-vercel-ip-country"),
      region: h.get("x-vercel-ip-country-region"),
    }),
    city: h.get("x-vercel-ip-city") ? decodeURIComponent(h.get("x-vercel-ip-city")!) : null,
    device: /mobile|iphone|android/i.test(ua)
      ? "mobile"
      : /ipad|tablet/i.test(ua)
        ? "tablet"
        : "desktop",
  };
}

export async function POST(req: NextRequest) {
  const { keeperPassword, actorName } = await req.json();
  const signedAs =
    typeof actorName === "string" && actorName.trim() ? actorName.trim() : null;
  const from = whereFrom(req);

  if (!checkKeeper(keeperPassword)) {
    await audit("admin.sign_in_failed", "admin", null, null, {
      tried_name: signedAs,
      ...from,
    });
    return NextResponse.json({ error: "wrong password" }, { status: 403 });
  }

  await audit("admin.signed_in", "admin", null, null, {
    by_name: signedAs ?? "someone who didn't give a name",
    ...from,
  });
  return NextResponse.json({ ok: true });
}
