-- The Connection Interview ("What Piece(s) of the Puzzle Do You Bring?"): a
-- second, separate conversation in which PRiSM learns what a person can bring to
-- WCC. Its record is kept apart from the vision on purpose: the vision is shared
-- on the collective map without names, while this one exists so the team can
-- follow up, and only with the person's consent.

alter table public.conversations drop constraint if exists conversations_kind_check;
alter table public.conversations
  add constraint conversations_kind_check check (kind in ('onboarding', 'decision', 'connection'));

create table public.connection_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  conversation_id uuid references public.conversations (id) on delete set null,
  -- draft = LLM extraction; confirmed = what the person edited and approved
  draft jsonb,
  confirmed jsonb,
  -- every consent defaults to false; only what the person ticked is true
  consents jsonb not null default '{}'::jsonb,
  -- name, email, phone, preferred_method — present only if they chose contact
  contact jsonb,
  status text not null default 'draft' check (status in ('draft', 'confirmed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  confirmed_at timestamptz
);

alter table public.connection_profiles enable row level security;

create policy "own connection profile" on public.connection_profiles
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
