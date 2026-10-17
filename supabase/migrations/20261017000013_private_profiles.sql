-- profiles were readable by every signed-in user, anonymous ones included, so anyone
-- who walked in could list every member's email and joined_from (city, region,
-- device). Nothing in the app needs another person's row through the user's own
-- session: the collective, audit, synthesis and admin reads all go through the
-- service role. So a member now sees only themselves.

drop policy if exists "profiles are visible to members" on public.profiles;
create policy "members see only their own profile" on public.profiles
  for select to authenticated using (auth.uid() = id);
