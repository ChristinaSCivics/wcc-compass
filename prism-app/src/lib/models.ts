/**
 * Which model does which job.
 *
 * These are not the same task. The conversation and the syntheses are the
 * product — Prism has to follow what someone actually said, notice when two
 * people mean different things by one word, and write it back in their voice.
 * Extraction is transcription: take a transcript that already exists and put
 * it in a shape, inventing nothing. That is exactly the work a small model is
 * good at, and it is also the call we make most often.
 *
 * Splitting them means the expensive model is spent where quality shows, and
 * the cheap one absorbs the volume. Both are one environment variable away
 * from changing — including to a local model later, since the prompts and the
 * data are ours.
 */

/** Conversation, synthesis, and the collective weave. */
export const PRISM_MODEL = process.env.PRISM_MODEL || "claude-sonnet-4-6";

/** Turning a finished transcript into a structured draft. */
export const EXTRACT_MODEL =
  process.env.PRISM_EXTRACT_MODEL || "claude-haiku-4-5-20251001";
