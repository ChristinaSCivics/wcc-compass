"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminNav } from "@/components/AdminNav";
import { getKeeperPassword, clearKeeperPassword } from "@/lib/keeperClient";

type Contact = {
  contact: { name: string; email: string; phone: string; preferred_method: string };
  consents: Record<string, boolean>;
  recap: Record<string, unknown>;
  confirmedAt: string;
};
type Data = { contacts: Contact[]; totals: Record<string, Record<string, number>>; completed: number };

const label = (k: string) => k.replace(/_/g, " ");

function show(v: unknown): string {
  if (v == null || v === "") return "";
  if (typeof v === "string") return v;
  if (Array.isArray(v)) {
    return v
      .map((x) => (typeof x === "string" ? label(x) : Object.values(x ?? {}).filter(Boolean).join(" · ")))
      .filter(Boolean)
      .join("; ");
  }
  return JSON.stringify(v);
}

/** Keeper-only: who wants to help, and what kind of help is showing up. */
export default function Connections() {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const keeperPassword = getKeeperPassword();
      if (!keeperPassword) {
        router.replace("/admin");
        return;
      }
      const res = await fetch("/api/admin/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keeperPassword }),
      });
      if (res.status === 403) {
        clearKeeperPassword();
        setError("That keeper password wasn't right — reload to try again.");
        return;
      }
      if (!res.ok) {
        setError("Couldn't load connections.");
        return;
      }
      setData(await res.json());
    })();
  }, [router]);

  return (
    <>
      <AdminNav />
      <main className="min-h-screen max-w-3xl mx-auto w-full px-6 py-10">
        <h1 className="text-4xl mb-3">Pieces of the puzzle</h1>
        <p className="text-muted mb-8 text-sm leading-relaxed">
          Connection Interview results. People who asked to be contacted are listed in full;
          everyone else appears only in the totals, with no name. Keeper-only page.
        </p>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        {!error && !data && <p className="text-muted text-sm">Loading…</p>}

        {data && (
          <>
            <section className="mb-10">
              <h2 className="text-xl mb-3">
                What&apos;s showing up{" "}
                <span className="text-sm text-muted">· {data.completed} completed</span>
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {Object.entries(data.totals).map(([k, counts]) => (
                  <div key={k} className="rounded-xl border border-borderline bg-surface p-4">
                    <h3 className="text-xs text-accent tracking-widest uppercase mb-2">{label(k)}</h3>
                    {Object.keys(counts).length === 0 ? (
                      <p className="text-sm text-muted">None yet</p>
                    ) : (
                      <ul className="text-sm space-y-1">
                        {Object.entries(counts)
                          .sort((a, b) => b[1] - a[1])
                          .map(([item, n]) => (
                            <li key={item} className="flex justify-between gap-3">
                              <span>{label(item)}</span>
                              <span className="text-muted">{n}</span>
                            </li>
                          ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-xl mb-3">Asked to be contacted ({data.contacts.length})</h2>
              {data.contacts.length === 0 && <p className="text-muted text-sm">No one yet.</p>}
              <div className="space-y-4">
                {data.contacts.map((c, i) => (
                  <div key={i} className="rounded-xl border border-borderline bg-surface p-5">
                    <p className="text-lg">{c.contact.name || "Unnamed"}</p>
                    <p className="text-sm text-muted">
                      <a href={`mailto:${c.contact.email}`} className="text-accent">{c.contact.email}</a>
                      {c.contact.phone && <> · {c.contact.phone}</>}
                      {" · prefers "}{c.contact.preferred_method}
                      {" · "}{new Date(c.confirmedAt).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-muted mt-1">
                      {c.consents.email_updates ? "Wants email updates" : "No email updates"}
                    </p>
                    <dl className="mt-4 space-y-2 text-sm">
                      {Object.entries(c.recap)
                        .filter(([, v]) => show(v))
                        .map(([k, v]) => (
                          <div key={k}>
                            <dt className="text-xs text-accent tracking-widest uppercase">{label(k)}</dt>
                            <dd className="leading-relaxed">{show(v)}</dd>
                          </div>
                        ))}
                    </dl>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </>
  );
}
