import { createAdminClient } from "./supabase/admin";

/**
 * Append an event to the tamper-evident audit log.
 * The hash chain (prev_hash -> hash) is computed by a Postgres trigger,
 * serialized with an advisory lock so the chain never forks.
 */
export async function audit(
  eventType: string,
  entityType: string,
  entityId: string | null,
  actor: string | null,
  payload: Record<string, unknown> = {}
) {
  const admin = createAdminClient();
  const { error } = await admin.from("audit_log").insert({
    event_type: eventType,
    entity_type: entityType,
    entity_id: entityId,
    actor,
    payload,
    // prev_hash/hash are overwritten by the trigger; placeholders satisfy NOT NULL
    prev_hash: "",
    hash: "",
  });
  if (error) console.error("audit log write failed:", error.message);
}
