/**
 * Values -> Action, thin slice.
 *
 * The goal named in the WCC material is moving a person from "what world do
 * you want?" to "who already shares it, and what can you do now?" This is the
 * smallest honest version: find where the member's own confirmed words echo in
 * the collective weave, and point at one concrete thing they could do next.
 *
 * This is deliberately a WORD-LEVEL ECHO, not an inference about the person.
 * The UI must say so — Prism does not get to quietly decide what someone means.
 */

export type WeaveThread = {
  thread?: string;
  carried_by?: string[];
  in_their_words?: string;
};

export type Weave = {
  shared_threads?: WeaveThread[];
  values_in_common?: string[];
};

export type CoreValue = { value?: string; their_definition?: string };

/** Words too common to be evidence of anything. */
const STOPWORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "have", "has", "had",
  "not", "but", "you", "your", "our", "their", "they", "them", "our", "its",
  "are", "was", "were", "been", "being", "can", "will", "would", "could",
  "should", "what", "when", "where", "who", "how", "why", "all", "any", "more",
  "most", "some", "such", "own", "same", "than", "too", "very", "just", "also",
  "into", "over", "then", "there", "here", "about", "which", "while", "each",
  "other", "others", "people", "person", "thing", "things", "want", "wants",
  "like", "feel", "feels", "make", "makes", "made", "good", "life", "live",
  "living", "world", "way", "ways", "one", "everyone", "something", "anything",
]);

export function significantWords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w));
}

export type ThreadEcho = {
  thread: string;
  inTheirWords: string | null;
  voices: number;
  echoes: string[];
};

/**
 * Returns the weave threads where at least one distinctive word from the
 * member's own confirmed values appears, with the matching words surfaced so
 * the person can judge the match themselves.
 */
export function echoedThreads(
  coreValues: CoreValue[],
  weave: Weave | null | undefined,
  limit = 3
): ThreadEcho[] {
  if (!weave?.shared_threads?.length) return [];

  const mine = new Set<string>();
  for (const cv of coreValues ?? []) {
    for (const w of significantWords(
      `${cv?.value ?? ""} ${cv?.their_definition ?? ""}`
    )) {
      mine.add(w);
    }
  }
  if (mine.size === 0) return [];

  const out: ThreadEcho[] = [];
  for (const t of weave.shared_threads) {
    const threadText = (t?.thread ?? "").trim();
    if (!threadText) continue;
    const haystack = significantWords(`${threadText} ${t?.in_their_words ?? ""}`);
    const echoes = [...new Set(haystack.filter((w) => mine.has(w)))];
    if (echoes.length === 0) continue;
    out.push({
      thread: threadText,
      inTheirWords: (t?.in_their_words ?? "").trim() || null,
      voices: Array.isArray(t?.carried_by) ? t.carried_by.length : 0,
      echoes,
    });
  }

  // Strongest echoes first, then the threads more people carry.
  out.sort((a, b) => b.echoes.length - a.echoes.length || b.voices - a.voices);
  return out.slice(0, limit);
}
