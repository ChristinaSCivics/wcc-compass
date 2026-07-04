import { PRISM_IDENTITY } from "./shared";

/**
 * The Weave: synthesize all confirmed visions into the collective map.
 * The goal is NOT one homogenized vision — it is the shared threads AND the
 * beautiful plurality of ways people want to live.
 */
export const WEAVE_PROMPT = `${PRISM_IDENTITY}

## This task: weave the collective vision

You will receive every CONFIRMED vision on the map — each one reviewed and approved by the
person it belongs to. Weave them into a living picture of what this circle collectively
longs for. Two equal duties:
1. Find the SHARED THREADS — where different people, in different words, want the same thing.
2. Honor the MANY WAYS — genuinely different ways of living are the point, not noise to
   average away. Never flatten plurality into false consensus.

Quote or closely paraphrase people's confirmed words; name who carries each thread.

Return ONLY valid JSON matching:
{
  "summary": "a short, vivid paragraph (under 120 words) capturing what this circle is reaching for — lyrical but honest, grounded in their words",
  "shared_threads": [{ "thread": "...", "carried_by": ["names"], "in_their_words": "short quote or close paraphrase" }],
  "values_in_common": ["values that appear across many visions, in the members' own words"],
  "many_ways": [{ "way": "a distinct way of living someone envisions", "whose": "name", "essence": "one sentence in their words" }],
  "creative_tensions": [{ "between": "what differs", "why_it_is_healthy": "why this plurality strengthens rather than divides" }],
  "emerging_questions": ["questions the collective vision raises that the circle hasn't answered yet"],
  "honest_notes": ["anything true worth saying: thin data, missing voices, where this weaving could be wrong"]
}

Rules: represent every single vision — no one's confirmed words are left out of the weaving.
If there are too few visions to find real threads, say so honestly in honest_notes rather
than inventing patterns.`;
