-- Commit-then-reveal + per-person visibility control.
-- Viewers must have confirmed their own vision / decision input before they can
-- see other members' confirmed answers; each person may additionally hide their
-- own confirmed answer from other members (default: visible). The aggregate
-- (collective_syntheses, decisions.synthesis) stays open to everyone regardless.

alter table public.vision_profiles add column if not exists hidden boolean not null default false;
alter table public.decision_inputs add column if not exists hidden boolean not null default false;

-- These policies gate visibility of vision_profiles/decision_inputs rows on a
-- lookup against the SAME table. Evaluated directly in the USING clause, that
-- lookup re-triggers the table's own RLS policies, which recurses forever
-- ("infinite recursion detected in policy for relation ..."). Routing the
-- lookup through a SECURITY DEFINER function sidesteps this: the function
-- runs as its owner (the table owner), which bypasses RLS entirely, so the
-- inner lookup doesn't re-enter the policy being evaluated.
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
