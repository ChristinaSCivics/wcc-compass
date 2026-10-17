"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { DraftEditor, type FieldGroup } from "@/components/DraftEditor";
import { TopNav } from "@/components/TopNav";

/**
 * The Connection Interview's recap and permissions. PRiSM drafts; the person
 * edits; then each permission is its own yes/no, all off until they tick it.
 * Nothing reaches the team unless "contact me" is ticked and contact details
 * are given.
 */
const GROUPS: FieldGroup[] = [
  { title: "You", keys: ["background", "passion", "calling"] },
  {
    title: "What you can bring",
    hint: "Skills, resources, and where you might fit",
    keys: ["skills", "skills_other", "resources", "needs_matched"],
  },
  {
    title: "How you'd like to be part of this",
    keys: ["ways_to_participate", "time_capacity", "organizations", "referrals"],
  },
];

type Consents = {
  contact_me: boolean;
  note_my_organization: boolean;
  email_updates: boolean;
  note_my_referrals: boolean;
};

const NONE: Consents = {
  contact_me: false,
  note_my_organization: false,
  email_updates: false,
  note_my_referrals: false,
};

function hasItems(v: unknown) {
  return Array.isArray(v) ? v.length > 0 : typeof v === "string" && v.trim().length > 0;
}

export default function ConnectionReview() {
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [consents, setConsents] = useState<Consents>(NONE);
  const [contact, setContact] = useState({ name: "", email: "", phone: "", preferred_method: "email" });
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<null | { contacted: boolean }>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data }, { data: profile }] = await Promise.all([
        supabase
          .from("connection_profiles")
          .select("draft, confirmed, status, consents, contact")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase.from("profiles").select("display_name, email").eq("id", user.id).single(),
      ]);
      if (data) {
        setDraft((data.status === "confirmed" ? data.confirmed : data.draft) as Record<string, unknown>);
        if (data.consents) setConsents({ ...NONE, ...(data.consents as Partial<Consents>) });
      }
      const saved = (data?.contact ?? {}) as Partial<typeof contact>;
      setContact((c) => ({
        ...c,
        name: saved.name ?? profile?.display_name ?? "",
        email: saved.email ?? profile?.email ?? user.email ?? "",
        phone: saved.phone ?? "",
        preferred_method: saved.preferred_method ?? "email",
      }));
      setLoading(false);
    })();
  }, []);

  async function confirm(edited: Record<string, unknown>) {
    setError(null);
    if (consents.contact_me && !contact.email.trim()) {
      setError("Add an email so the team can reach you — or untick “contact me”.");
      return;
    }
    setConfirming(true);
    const res = await fetch("/api/connect/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: edited, consents, contact: consents.contact_me ? contact : null }),
    });
    setConfirming(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Couldn't save that — please try again.");
      return;
    }
    setDone({ contacted: consents.contact_me });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const set = (k: keyof Consents) => (v: boolean) => setConsents((c) => ({ ...c, [k]: v }));

  const permissions = draft && (
    <section className="rounded-2xl border border-borderline bg-surface p-5 sm:p-6 space-y-4">
      <h2 className="text-xl">How we&apos;d like to stay connected</h2>
      <p className="text-sm text-muted leading-relaxed">
        You choose, and each one is separate. If you say yes, the team sees this recap, your
        contact details and your choices, so a person can follow up. Never your conversation.
        You can ask us to correct or delete it any time at{" "}
        <a href="mailto:admin@worldcocreation.com" className="text-accent underline">
          admin@worldcocreation.com
        </a>
        . More on the{" "}
        <Link href="/privacy" className="text-accent underline">privacy page</Link>.
      </p>

      <Check checked={consents.contact_me} onChange={set("contact_me")}>
        Add me as a contact so the WCC team can reach out to me.
      </Check>

      {consents.contact_me && (
        <div className="grid gap-3 sm:grid-cols-2 pl-7">
          <Field label="Name" value={contact.name} onChange={(v) => setContact({ ...contact, name: v })} />
          <Field
            label="Email"
            type="email"
            value={contact.email}
            onChange={(v) => setContact({ ...contact, email: v })}
          />
          <Field
            label="Phone (optional)"
            type="tel"
            value={contact.phone}
            onChange={(v) => setContact({ ...contact, phone: v })}
          />
          <label className="block">
            <span className="block text-xs text-muted mb-1">Best way to reach you</span>
            <select
              value={contact.preferred_method}
              onChange={(e) => setContact({ ...contact, preferred_method: e.target.value })}
              className="w-full bg-surface-raised border border-borderline rounded-lg px-3 py-2.5
                         focus:outline-none focus:border-accent"
            >
              <option value="email">Email</option>
              <option value="phone">Phone call</option>
              <option value="text">Text message</option>
            </select>
          </label>
        </div>
      )}

      {hasItems(draft.organizations) && (
        <Check checked={consents.note_my_organization} onChange={set("note_my_organization")}>
          Note my organization as a potential ally, with me as the contact. WCC won&apos;t
          contact the organization without my OK.
        </Check>
      )}

      <Check checked={consents.email_updates} onChange={set("email_updates")}>
        Send me email updates about World Co-Creation.
      </Check>

      {hasItems(draft.referrals) && (
        <Check checked={consents.note_my_referrals} onChange={set("note_my_referrals")}>
          Keep a note of the people I mentioned so the team can ask me about introductions.
          WCC never contacts them directly.
        </Check>
      )}
    </section>
  );

  return (
    <>
      <TopNav />
      <main className="min-h-screen max-w-2xl mx-auto w-full px-6 py-10">
        {done ? (
          <div className="fade-up">
            <h1 className="text-3xl mb-4">Thank you.</h1>
            {done.contacted ? (
              <p className="text-muted leading-relaxed">
                Someone from the team will be in touch. We can&apos;t promise when, but your
                piece matters, and we&apos;re glad you&apos;re here. If you&apos;d like to meet
                others and hear where we are, join one of our live sessions at{" "}
                <a href="https://worldcocreation.com/meet" className="text-accent underline">
                  worldcocreation.com/meet
                </a>
                . Bring your piece.
              </p>
            ) : (
              <p className="text-muted leading-relaxed">
                Nothing has been shared with the team. If you&apos;d ever like to be part of
                this, you can find us at{" "}
                <a href="https://worldcocreation.com" className="text-accent underline">
                  worldcocreation.com
                </a>
                . Bring your piece.
              </p>
            )}
            <p className="mt-4 text-muted leading-relaxed">
              If you&apos;d like to give, our support page is at{" "}
              <a href="https://worldcocreation.com/support" className="text-accent underline">
                worldcocreation.com/support
              </a>
              .
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link
                href="/dashboard"
                className="px-7 py-3 border border-accent text-accent rounded-full
                           hover:bg-accent hover:text-background transition-all"
              >
                Back to your home →
              </Link>
              <a href="/connect/start" className="text-sm text-muted hover:text-accent transition-colors">
                Add something — keep talking with PRiSM
              </a>
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-3xl mb-3">Here&apos;s what I&apos;m hearing about you</h1>
            <p className="text-muted mb-8 leading-relaxed">
              PRiSM drafted this from your conversation. Change anything you like — then choose
              how, or whether, we stay in touch.
            </p>
            {loading && <p className="text-muted text-sm">Loading…</p>}
            {!loading && !draft && (
              <p className="text-muted">
                Nothing to review yet.{" "}
                <a href="/connect/start" className="text-accent underline">
                  Start the conversation
                </a>
                .
              </p>
            )}
            {draft && (
              <DraftEditor
                draft={draft}
                groups={GROUPS}
                onConfirm={confirm}
                confirming={confirming}
                beforeConfirm={permissions}
                confirmLabel="This is me — save it"
                footnote="Only the choices you ticked are shared. Leave them all off and nothing goes to the team."
              />
            )}
            {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
            <p className="text-sm text-muted mt-6">
              Want to add something?{" "}
              <a href="/connect/start" className="text-accent underline">
                Keep talking with PRiSM
              </a>
              .
            </p>
          </>
        )}
      </main>
    </>
  );
}

function Check({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 mt-1 accent-teal shrink-0"
      />
      <span className="text-sm leading-relaxed">{children}</span>
    </label>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="block text-xs text-muted mb-1">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-surface-raised border border-borderline rounded-lg px-3 py-2.5
                   focus:outline-none focus:border-accent transition-colors"
      />
    </label>
  );
}
