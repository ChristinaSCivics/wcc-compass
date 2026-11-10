-- Entering without an account mints a new spot on every device, so one person
-- can hold several. The admin pages grouped spots by name, which merges two
-- different people who share one (two Peters) and can't join one person under
-- two names (PeterPan, Peter Pantazis). A keeper now links spots explicitly:
-- spots with the same person_id are one person; a spot with none is grouped by
-- name as before. Only the service role writes it — no grant to authenticated.
alter table public.profiles
  add column if not exists person_id uuid references public.profiles (id) on delete set null;
