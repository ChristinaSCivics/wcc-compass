-- Segment test/demo accounts from real participation.
-- Test profiles (and everything attributed to them) can be excluded from
-- synthesis and analysis with a simple join.
alter table public.profiles add column if not exists is_test boolean not null default false;
