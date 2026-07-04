-- Prism's woven syntheses of the collective vision — the visible output of
-- "thinking together." Append-only history; each row = one weaving run.
create table public.collective_syntheses (
  id uuid primary key default gen_random_uuid(),
  content jsonb not null,
  member_count int not null,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.collective_syntheses enable row level security;
create policy "syntheses visible to members" on public.collective_syntheses
  for select to authenticated using (true);
