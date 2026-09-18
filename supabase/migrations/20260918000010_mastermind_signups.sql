-- The demo's exit action: somewhere for a person to say "invite me" at the end
-- of their first conversation.
--
-- Deliberately separate from auth. Someone can sign up for the call without
-- creating an account, and an anonymous participant can leave an email here
-- without it becoming a login. Email only — no phone: asking a stranger for a
-- phone number costs more people than it gains, and this is a warm ask, not a
-- gate at the door.
create table public.mastermind_signups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  email text not null,
  -- Explicit opt-in, never pre-ticked. Soliciting anyone later needs a
  -- confirmed opt-in, so this column is doing real work.
  mailing_list_opt_in boolean not null default false,
  created_at timestamptz not null default now()
);

-- One row per person, so a second submission updates rather than duplicates.
create unique index mastermind_signups_email_key
  on public.mastermind_signups (lower(email));

alter table public.mastermind_signups enable row level security;
-- No policies: writes go through the service role in /api/mastermind, and
-- nothing client-side can read the list back.
