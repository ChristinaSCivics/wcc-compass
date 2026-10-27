import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TopNav } from "@/components/TopNav";
import { SaveSpot } from "@/components/SaveSpot";
import { GoogleButton } from "@/components/GoogleButton";
import { SignOutButton } from "@/components/SignOutButton";
import { UpdatesOptIn } from "@/components/UpdatesOptIn";
import { NameEditor, AccountToggle, PasswordSetter } from "@/components/AccountControls";
import { mastermindDate } from "@/lib/mastermind";
import { newsletterStatus } from "@/lib/emailoctopus";

const CONTACT = "admin@worldcocreation.com";

/**
 * Your spot: is it saved, how you get back in, and what you've given us —
 * and every switch for it, here, rather than a link to somewhere else.
 *
 * Saving a spot used to end in a sentence that scrolled away, and after a
 * Google sign-in there was nothing at all — no way to see that it had
 * worked. This is the one place that says so, plainly, and lets you change
 * each part on the spot.
 */
export default async function Account() {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: profile },
    { data: vision },
    { data: connection },
    { data: signup },
    { count: conversations },
  ] = await Promise.all([
    supabase.from("profiles").select("display_name, email, created_at").eq("id", user.id).single(),
    supabase.from("vision_profiles").select("status").eq("user_id", user.id).maybeSingle(),
    supabase.from("connection_profiles").select("status, consents").eq("user_id", user.id).maybeSingle(),
    // RLS blocks client reads of the signup list.
    admin.from("mastermind_signups").select("mailing_list_opt_in").eq("user_id", user.id).maybeSingle(),
    supabase.from("conversations").select("id", { count: "exact", head: true }).eq("user_id", user.id),
  ]);

  const providers = new Set(
    (user.identities ?? []).map((i) => i.provider).concat((user.app_metadata?.providers as string[]) ?? [])
  );
  const google = providers.has("google");
  const password = providers.has("email");
  const saved = !user.is_anonymous;
  const email = user.email ?? profile?.email ?? null;
  const consents = (connection?.consents ?? {}) as Record<string, boolean>;
  // EmailOctopus is the truth here: it knows about unsubscribes from a footer.
  const newsletter = email ? await newsletterStatus(email) : "no";
  const when = mastermindDate();
  const since = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null;

  return (
    <>
    <TopNav />
    <main className="min-h-screen horizon px-6 py-10 max-w-2xl mx-auto w-full">
      <NameEditor name={profile?.display_name ?? "You"} />
      {since && <p className="text-muted mt-1 text-sm">Here since {since}</p>}

      {/* ---- is it saved, and how you get back in ---- */}
      {!saved ? (
        <section className="mt-8 rounded-2xl border border-amber/50 bg-surface p-5 sm:p-6">
          <span className="block text-xs text-amber tracking-[0.16em] uppercase mb-2">
            Not saved yet
          </span>
          <p className="text-sm text-muted leading-relaxed mb-4">
            Your conversations live in this browser only. Clear it, or come back on
            another device, and they can&rsquo;t be reached. Saving takes one tap with Google.
          </p>
          <SaveSpot when={when} startOpen />
        </section>
      ) : (
        <section className="mt-8 rounded-2xl border border-teal/60 bg-surface-raised p-5 sm:p-6">
          <span className="block text-xs text-teal tracking-[0.16em] uppercase mb-2">
            Your spot is saved ◈
          </span>
          {email && (
            <p className="text-sm leading-relaxed">
              Signed in as <span className="text-accent break-all">{email}</span>
            </p>
          )}
          <p className="text-xs text-muted leading-relaxed mt-1">
            On any device, open the Compass, choose &ldquo;Saved a spot here before? Sign
            in&rdquo;, and you&rsquo;ll be right back here.
          </p>

          <h2 className="text-xs text-muted tracking-[0.16em] uppercase mt-5 mb-2">Ways to sign in</h2>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center justify-between gap-3 flex-wrap">
              <span>Google</span>
              {google ? (
                <span className="text-teal text-xs">Connected ✓</span>
              ) : (
                <GoogleButton mode="link" next="/account" label="Connect Google" className="w-44" />
              )}
            </li>
            <li className="flex items-center justify-between gap-3 flex-wrap">
              <span>Email and password</span>
              {password && <span className="text-teal text-xs">Set ✓</span>}
            </li>
            <li><PasswordSetter hasPassword={password} /></li>
          </ul>
        </section>
      )}

      {/* ---- your choices, each switchable here ---- */}
      <section className="mt-8">
        <h2 className="text-xs text-muted tracking-[0.16em] uppercase mb-3">Your choices</h2>
        <ul className="divide-y divide-borderline rounded-2xl border border-borderline bg-surface">
          <Row
            title="The first mastermind"
            status={
              signup
                ? `You're on the list${when ? ` for ${when}` : ""} — the link comes by email`
                : saved ? "Not signed up" : "Save your spot first, so the link has somewhere to go"
            }
          >
            {saved && email && <AccountToggle action="call" on={!!signup} label="Invite me to the call" />}
          </Row>
          <Row
            title="Occasional updates by email"
            status={
              newsletter === "subscribed"
                ? `Yes, to ${email} — every email has an unsubscribe link`
                : newsletter === "unsubscribed"
                  ? "You unsubscribed — tick the box to start again"
                  : newsletter === "unknown"
                    ? signup?.mailing_list_opt_in || consents.email_updates ? "Yes" : "No"
                    : saved && email
                      ? `Not yet — tick to get them at ${email}`
                      : "Save your spot first, so we have somewhere to send them"
            }
          >
            {saved && email && newsletter !== "unknown" && (
              <UpdatesOptIn on={newsletter === "subscribed"} />
            )}
          </Row>
          <Row
            title="The team may follow up about your piece"
            status={
              connection?.status !== "confirmed"
                ? "Once you've done “What Piece(s) of the Puzzle Do You Bring?”"
                : consents.contact_me
                  ? "Yes — someone from WCC may reach out about where you fit"
                  : "No — your piece stays private"
            }
            href={connection?.status === "confirmed" ? undefined : "/connect/start"}
            action={connection?.status === "confirmed" ? undefined : "Begin"}
          >
            {connection?.status === "confirmed" && saved && (
              <AccountToggle action="contact" on={!!consents.contact_me} label="Yes, the team may contact me" />
            )}
          </Row>
        </ul>
      </section>

      {/* ---- what you've shared ---- */}
      <section className="mt-8">
        <h2 className="text-xs text-muted tracking-[0.16em] uppercase mb-3">What you&rsquo;ve shared</h2>
        <ul className="divide-y divide-borderline rounded-2xl border border-borderline bg-surface">
          <Row
            title="Your vision"
            status={
              vision?.status === "confirmed"
                ? "Confirmed — on the collective map, without your name"
                : vision?.status === "draft"
                  ? "Drafted, waiting for you to confirm"
                  : "Not started"
            }
            href={vision ? "/vision" : "/journey"}
            action={vision ? "Edit" : "Begin"}
          />
          <Row
            title="Your piece of the puzzle"
            status={
              connection?.status === "confirmed"
                ? "Saved"
                : connection ? "Recap drafted, not yet saved" : "Not started"
            }
            href={connection ? "/connect/review" : "/connect/start"}
            action={connection ? "Edit" : "Begin"}
          />
          <Row
            title="Conversations with PRiSM"
            status={`${conversations ?? 0} ${conversations === 1 ? "conversation" : "conversations"}`}
          />
        </ul>
      </section>

      {/* ---- leaving ---- */}
      <section className="mt-8 text-sm text-muted leading-relaxed">
        <div className="flex items-center gap-4 flex-wrap">
          <SignOutButton
            label="Sign out"
            className="border border-borderline rounded-lg px-4 py-2 text-sm
                       hover:border-accent hover:text-accent transition-all"
          />
          <a
            href={`mailto:${CONTACT}?subject=${encodeURIComponent("Please delete my Compass spot")}&body=${encodeURIComponent(
              `Please delete everything the Compass holds for me.\n\nName: ${profile?.display_name ?? ""}\nEmail: ${email ?? "(none saved)"}\nAccount: ${user.id}`
            )}`}
            className="text-xs text-muted hover:text-accent underline underline-offset-4"
          >
            Delete everything
          </a>
          <Link href="/privacy" className="text-xs underline underline-offset-4 hover:text-accent">
            How your words are kept
          </Link>
        </div>
        <p className="text-xs text-muted/70 mt-3">
          &ldquo;Delete everything&rdquo; opens an email to the team with your details filled
          in; we&rsquo;ll confirm when it&rsquo;s done.
        </p>
      </section>
    </main>
    </>
  );
}

function Row({
  title, status, href, action, children,
}: { title: string; status: string; href?: string; action?: string; children?: React.ReactNode }) {
  return (
    <li className="px-5 py-4 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <span className="block text-sm">{title}</span>
        <span className="block text-xs text-muted mt-0.5 leading-relaxed break-words">{status}</span>
        {children}
      </div>
      {href && action && (
        <Link href={href} className="shrink-0 text-xs text-accent hover:underline mt-0.5">
          {action} →
        </Link>
      )}
    </li>
  );
}
