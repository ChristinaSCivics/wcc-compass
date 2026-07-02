import { createHash } from "crypto";

/**
 * Human label for the current question set — bump this when the circle
 * meaningfully changes Prism's questions (e.g. "v2-after-circle-review").
 * The content hash is appended automatically, so even unlabeled edits
 * are distinguishable in the data.
 */
export const PROMPT_LABEL = "v1-founding-circle";

export function promptVersion(promptText: string): string {
  const hash = createHash("sha256").update(promptText).digest("hex").slice(0, 12);
  return `${PROMPT_LABEL}@${hash}`;
}
