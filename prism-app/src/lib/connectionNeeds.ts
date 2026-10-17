/**
 * What WCC most needs right now. This drives how PRiSM describes current needs
 * in the Connection Interview, and the needs a person can be matched to.
 * Edit this list as priorities change; weights are Peter's starting point
 * (3 = high, 2 = medium, 1 = low).
 */
export const CURRENT_NEEDS = [
  { key: "programmer", label: "programmers and engineers", weight: 3 },
  { key: "systems_builder", label: "people who can build systems", weight: 3 },
  { key: "marketing_social", label: "marketing and social media help", weight: 3 },
  { key: "grant_writer", label: "grant writers", weight: 3 },
  { key: "donor", label: "people who can give or help us find funding", weight: 3 },
  { key: "video_design", label: "video and design help", weight: 2 },
  { key: "event_hosting", label: "event hosting", weight: 2 },
  { key: "aligned_organization", label: "aligned organizations", weight: 2 },
  { key: "general_supporter", label: "general supporters", weight: 1 },
] as const;

export const SKILLS = [
  "software_engineering", "ai_ml", "systems_design", "data", "product_design",
  "graphic_design", "video_production", "marketing", "social_media", "content_writing",
  "grant_writing", "fundraising", "community_organizing", "facilitation",
  "project_management", "research", "education", "legal", "finance_accounting",
  "event_hosting", "advisory", "other",
] as const;

export const WAYS_TO_PARTICIPATE = [
  "join_team", "volunteer_time", "donate", "help_find_funders",
  "introduce_organizations", "share_vision", "advise", "other",
] as const;

/** The high-weight needs, in plain words, for PRiSM to say out loud. */
export function needsInPlainWords() {
  const high = CURRENT_NEEDS.filter((n) => n.weight === 3).map((n) => n.label);
  return high.length > 1
    ? `${high.slice(0, -1).join(", ")}, and ${high[high.length - 1]}`
    : high.join("");
}
