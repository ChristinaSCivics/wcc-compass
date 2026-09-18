-- The unique index was on lower(email), an expression index, which Postgres
-- will not match to ON CONFLICT (email) — so every signup failed with
-- "there is no unique or exclusion constraint matching the ON CONFLICT
-- specification". Store the address already lowercased instead, and put a
-- plain unique constraint on the column, which keeps the case-insensitive
-- dedupe and works with upsert.
drop index if exists public.mastermind_signups_email_key;

update public.mastermind_signups set email = lower(email);

alter table public.mastermind_signups
  add constraint mastermind_signups_email_key unique (email);
