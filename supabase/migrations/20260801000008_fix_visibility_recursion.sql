-- Fixes "infinite recursion detected in policy for relation vision_profiles/decision_inputs",
-- introduced by 20260725000007_visibility.sql. Those policies gated visibility on a lookup
-- against the same table from inside the USING clause, which re-triggers the table's own RLS
-- and recurses forever. Routing the lookup through a SECURITY DEFINER function fixes it: the
-- function runs as its owner (the table owner), which bypasses RLS, so the inner lookup
-- doesn't re-enter the policy being evaluated.

create or replace function public.has_confirmed_vision(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.vision_profiles
    where user_id = p_user_id and status = 'confirmed'
  );
$$;

create or replace function public.has_confirmed_input(p_decision_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.decision_inputs
    where decision_id = p_decision_id and user_id = p_user_id and confirmed = true
  );
$$;

drop policy if exists "confirmed visions visible to members" on public.vision_profiles;
create policy "confirmed visions visible to members" on public.vision_profiles
  for select to authenticated using (
    status = 'confirmed'
    and hidden = false
    and public.has_confirmed_vision(auth.uid())
  );

drop policy if exists "confirmed inputs visible to members" on public.decision_inputs;
create policy "confirmed inputs visible to members" on public.decision_inputs
  for select to authenticated using (
    confirmed = true
    and hidden = false
    and public.has_confirmed_input(decision_id, auth.uid())
  );
