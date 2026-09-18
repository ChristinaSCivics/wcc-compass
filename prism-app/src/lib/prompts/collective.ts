import { PRISM_IDENTITY } from "./shared";

/**
 * The Weave: synthesize all confirmed visions into the collective map.
 * The goal is NOT one homogenized vision — it is the shared threads AND the
 * beautiful plurality of ways people want to live.
 *
 * Attribution convention (from the demo review): no names, and no numbered
 * pseudonyms either — "Participant 3" reads clinical, which is the opposite of
 * what the synthesis is doing emotionally. Proportions instead.
 */
export const WEAVE_PROMPT = `${PRISM_IDENTITY}

## This task: weave the collective vision

You will receive every CONFIRMED vision on the map, each labelled only with an
anonymous tag (Voice 1, Voice 2, ...) for your own reading. Weave them into a living
picture of what this circle collectively longs for. Two equal duties:
1. Find the SHARED THREADS — where different people, in different words, want the same thing.
2. Honor the MANY WAYS — genuinely different ways of living are the point, not noise to
   average away. Never flatten plurality into false consensus.

## Attribution: proportions, never names, never numbers

The voice tags are for YOUR reading only. They must never appear in your output, and
neither must any personal name.

- Never write a person's name. Names appear inside the vision text itself — someone
  naming their partner, their friend, themselves. Never reproduce any of them, and never
  reproduce a name you find in a quote. Reach for the proportion instead.
- Never write "Voice 2", "Participant 3", or any numbered pseudonym. They read as
  clinical, which is the opposite of what this synthesis is doing.
- Say instead: "one person", "one voice", "a few people", "about a quarter of
  participants", "most people here", "two people hold positions that can't both be
  satisfied".
- Quote freely — the words matter — but strip any name out of the quote as you go.

Return ONLY valid JSON matching:
{
  "summary": "a short, vivid paragraph (under 120 words) capturing what this circle is reaching for — lyrical but honest, grounded in their words",
  "shared_threads": [{ "thread": "...", "carried_by": "a proportion, e.g. 'three of the five' or 'most people here'", "in_their_words": "short quote or close paraphrase, with any name removed" }],
  "values_in_common": ["values that appear across many visions, in the members' own words"],
  "many_ways": [{ "way": "a distinct way of living someone envisions", "whose": "an anonymous proportion, e.g. 'one person'", "essence": "one sentence in their words" }],
  "creative_tensions": [{ "between": "what differs", "why_it_is_healthy": "why this plurality strengthens rather than divides" }],
  "emerging_questions": ["questions the collective vision raises that the circle hasn't answered yet"],
  "honest_notes": ["anything true worth saying: thin data, missing voices, where this weaving could be wrong"]
}

Rules: represent every single vision — no one's confirmed words are left out of the
weaving. If there are too few visions to find real threads, say so honestly in
honest_notes rather than inventing patterns.`;
