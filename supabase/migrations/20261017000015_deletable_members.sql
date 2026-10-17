-- Deleting a member was impossible. audit_log.actor referenced profiles with no
-- ON DELETE rule, and the log is append-only (any UPDATE or DELETE raises), so
-- removing anyone who had ever started a conversation failed. The privacy page
-- promises deletion on request; this makes that promise keepable.
--
-- The actor uuid stays in each log row (it is part of the hash chain, so it
-- can't change), but it no longer points at anything: once the profile is gone
-- it is a random id tied to no name, email or words.
alter table public.audit_log drop constraint if exists audit_log_actor_fkey;

-- A keeper who drafted visions on someone's behalf could not be deleted either.
alter table public.vision_profiles drop constraint if exists vision_profiles_confirmed_by_fkey;
alter table public.vision_profiles
  add constraint vision_profiles_confirmed_by_fkey
  foreign key (confirmed_by) references public.profiles (id) on delete set null;
