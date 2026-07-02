-- Provenance: every conversation records which version of Prism's questions
-- it was conducted under, and extracted records inherit it. When the circle
-- changes the questions, data from before/after is cleanly segmentable.
alter table public.conversations add column if not exists prompt_version text;
alter table public.vision_profiles add column if not exists prompt_version text;
alter table public.decision_inputs add column if not exists prompt_version text;
