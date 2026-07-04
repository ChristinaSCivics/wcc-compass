-- In-app feedback from the pilot circle. Captured in context (page, time).
-- Read via service role (keepers); writers can see their own.
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  page text,
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;

create policy "members add own feedback" on public.feedback
  for insert to authenticated with check (auth.uid() = user_id);
create policy "members see own feedback" on public.feedback
  for select to authenticated using (auth.uid() = user_id);
