import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TopNav } from "@/components/TopNav";
import { SaveSpot } from "@/components/SaveSpot";
import { GoogleButton } from "@/components/GoogleButton";
import { SignOutButton } from "@/components/SignOutButton";
import { mastermindDate } from "@/lib/mastermind";
import { newsletterStatus } from "@/lib/emailoctopus";
import { UpdatesOptIn } from "@/components/UpdatesOptIn";

const CONTACT = "admin@worldcocreation.com";

/**
 * Your spot: is it saved, how you get back in, and what you've given us.
 *
 * Saving a spot used to end in a sentence that scrolled away, and after a
 * Google sign-in there was nothing at all — no way to see that it had
 * worked. This is the one place that says so, plainly, and lists everything
 * the Compass holds for you with the way to change each part.
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
  const email = user.email ?? profile?.email ?? null;
  const consents = (connection?.consents ?? {}) as Record<string, boolean>;
  // EmailOctopus is the truth here: it knows about unsubscribes from a footer.
  const newsletter = email ? await newsletterStatus(email) : "no";
  const since = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null;

  return (
    <>
    <TopNav />
    <main className="min-h-screen horizon px-6 py-10 max-w-2xl mx-auto w-full">
      <h1 className="text-3xl sm:text-4xl">{profile?.display_name ?? "Your spot"}</h1>
      {since && <p className="text-muted mt-1 text-sm">Here since {since}</p>}

      {/* ---- is it saved ---- */}
      {user.is_anonymous ? (
        <section className="mt-8 rounded-2xl border border-amber/50 bg-surface p-5 sm:p-6">
          <span className="block text-xs text-amber tracking-[0.16em] uppercase mb-2">
            Not saved yet
          </span>
          <p className="text-sm text-muted leading-relaxed mb-4">
            Your conversations live in this browser only. Clear it, or come back on
            another device, and they can&rsquo;t be reached. Saving takes one tap with Google.
          </p>
          <SaveSpot when={mastermindDate()} />
        </section>
      ) : (
        <section className="mt-8 rounded-2xl border border-teal/60 bg-surface-raised p-5 sm:p-6">
          <span className="block text-xs text-teal tracking-[0.16em] uppercase mb-2">
            Your spot is saved ◈
          </span>
          <p className="text-sm leading-relaxed">
            {google && password
              ? "You can sign in with Google or with your email and password"
              : google
                ? "You sign in with Google"
                : "You sign in with your email and password"}
            {email && <> as <span className="text-accent break-all">{email}</span></>}.
          </p>
          <p className="text-xs text-muted leading-relaxed mt-2">
            On any device, open the Compass, choose &ldquo;Saved a spot here before? Sign
            in&rdquo;, and you&rsquo;ll be right back here.
          </p>
          {!google && (
            <div className="mt-4 max-w-xs">
              <GoogleButton mode="link" next="/account" label="Also sign in with Google" />
            </div>
          )}
        </section>
      )}

      {/* ---- what you've given ---- */}
      <section className="mt-8">
        <h2 className="text-xs text-muted tracking-[0.16em] uppercase mb-3">What the Compass holds for you</h2>
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
            action={vision ? "Review or edit" : "Begin"}
          />
          <Row
            title="What piece(s) of the puzzle you bring"
            status={
              connection?.status === "confirmed"
                ? consents.contact_me
                  ? "Saved — the team may contact you"
                  : "Saved — kept private, no contact"
                : connection
                  ? "Recap drafted, not yet saved"
                  : "Not started"
            }
            href={connection ? "/connect/review" : "/connect/start"}
            action={connection ? "Review your choices" : "Begin"}
          />
          <Row
            title="The first mastermind"
            status={signup ? "You're on the list — the link comes by email" : "Not signed up"}
            href={signup ? undefined : "/dashboard"}
            action={signup ? undefined : "Sign up on Home"}
          />
          <Row
            title="Occasional updates by email"
            status={
              newsletter === "subscribed"
                ? `Yes, to ${email} — every email has an unsubscribe link`
                : newsletter === "unsubscribed"
                  ? "You unsubscribed — tick the box to start again"
                  : newsletter === "unknown"
                    ? signup?.mailing_list_opt_in || consents.email_updates ? "Yes" : "No"
                    : email
                      ? `Not yet — tick to get them at ${email}`
                      : "Save your spot first, so we have somewhere to send them"
            }
          >
            {email && !user.is_anonymous && newsletter !== "unknown" && (
              <UpdatesOptIn on={newsletter === "subscribed"} />
            )}
          </Row>
          <Row
            title="Conversations with PRiSM"
            status={`${conversations ?? 0} ${conversations === 1 ? "conversation" : "conversations"}`}
          />
        </ul>
      </section>

      {/* ---- changing your mind ---- */}
      <section className="mt-8 text-sm text-muted leading-relaxed">
        <p>
          To delete everything, or correct something you can&rsquo;t edit here, email{" "}
          <a href={`mailto:${CONTACT}`} className="text-accent underline underline-offset-4">
            {CONTACT}
          </a>
          {email ? " from the address above" : " with the name you used"}.{" "}
          <Link href="/privacy" className="underline underline-offset-4 hover:text-accent">
            How your words are kept
          </Link>
        </p>
        <SignOutButton
          label="Sign out"
          className="mt-5 border border-borderline rounded-lg px-4 py-2 text-sm
                     hover:border-accent hover:text-accent transition-all"
        />
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
