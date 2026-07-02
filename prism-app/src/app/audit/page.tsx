import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PrismMark } from "@/components/PrismMark";

/**
 * The open record: every significant event, hash-chained.
 * Each row's hash covers the previous row's hash — history cannot be
 * silently rewritten. Later: Merkle roots anchored to a public blockchain.
 */
export default async function AuditPage() {
  const supabase = await createClient();
  const { data: events } = await supabase
    .from("audit_log")
    .select("id, event_type, entity_type, created_at, hash, prev_hash, profiles(display_name)")
    .order("id", { ascending: false })
    .limit(200);

  return (
    <main className="min-h-screen max-w-3xl mx-auto w-full px-6 py-8">
      <header className="flex items-center gap-3 mb-10">
        <Link href="/dashboard"><PrismMark /></Link>
        <span className="text-sm text-muted">The open record</span>
      </header>

      <h1 className="text-4xl mb-3">In the open, in the light</h1>
      <p className="text-muted mb-10 max-w-xl leading-relaxed">
        Every significant event is chained to the one before it by a cryptographic
        hash — no one, including administrators, can quietly rewrite history.
        A future phase anchors this chain to a public blockchain.
      </p>

      <div className="space-y-px">
        {(events ?? []).map((e) => {
          const p = e.profiles as unknown as { display_name: string } | null;
          return (
            <div key={e.id} className="flex items-baseline gap-4 border-b border-borderline py-3 text-sm">
              <span className="text-muted tabular-nums shrink-0">#{e.id}</span>
              <div className="flex-1 min-w-0">
                <span className="text-gold">{e.event_type}</span>
                <span className="text-muted"> · {p?.display_name ?? "system"}</span>
                <div className="text-xs text-muted truncate font-mono mt-1">
                  {e.hash}
                </div>
              </div>
              <span className="text-muted text-xs shrink-0">
                {new Date(e.created_at).toLocaleString()}
              </span>
            </div>
          );
        })}
        {!events?.length && <p className="text-muted text-sm">No events yet.</p>}
      </div>
    </main>
  );
}
