-- World Co-Creation — core durable schema
-- Principle: the data is the permanent record; apps are v0.x and replaceable.

create extension if not exists pgcrypto;

-- ============================================================
-- Profiles (1:1 with auth.users)
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  email text,
  role text not null default 'member' check (role in ('member', 'facilitator', 'admin')),
  created_at timestamptz not null default now()
);

-- auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Conversations & messages (full transcripts — never discarded)
-- ============================================================
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('onboarding', 'decision')),
  decision_id uuid, -- fk added after decisions table
  status text not null default 'active' check (status in ('active', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index messages_conversation_idx on public.messages (conversation_id, created_at);

-- ============================================================
-- Vision profiles — the Global Values Survey record.
-- draft = LLM extraction; confirmed = human-approved ground truth.
-- The confirmed record is the dataset; the LLM draft never speaks for a person.
-- ============================================================
create table public.vision_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  draft jsonb,
  confirmed jsonb,
  status text not null default 'draft' check (status in ('draft', 'confirmed')),
  confirmed_at timestamptz,
  updated_at timestamptz not null default now()
);

-- ============================================================
-- Collective conversation: topics & contributions
-- ============================================================
create table public.topics (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.contributions (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  conversation_id uuid references public.conversations (id),
  content text not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Decision engine (founding-circle pilot)
-- ============================================================
create table public.decisions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text not null default 'gathering'
    check (status in ('gathering', 'synthesis', 'review', 'decided')),
  options jsonb,   -- candidate all-win options w/ per-value scoring + who-is-harmed flags
  synthesis jsonb, -- Prism's synthesis: agreements, genuine conflicts, term confusions
  outcome jsonb,   -- what the group ratified + rationale
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

alter table public.conversations
  add constraint conversations_decision_fk
  foreign key (decision_id) references public.decisions (id) on delete set null;

create table public.decision_inputs (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid not null references public.decisions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  conversation_id uuid references public.conversations (id),
  needs jsonb,       -- structured: needs, constraints, red_lines, term definitions
  confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (decision_id, user_id)
);

-- ============================================================
-- Audit log — hash-chained, tamper-evident.
-- Each row: sha256(prev_hash || event_type || entity || payload || created_at).
-- Later phases anchor a Merkle root of this chain to a public blockchain.
-- ============================================================
create table public.audit_log (
  id bigint generated always as identity primary key,
  event_type text not null,
  entity_type text not null,
  entity_id text,
  actor uuid references public.profiles (id),
  payload jsonb not null default '{}'::jsonb,
  prev_hash text not null,
  hash text not null,
  created_at timestamptz not null default now()
);

create or replace function public.audit_log_chain()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  last_hash text;
begin
  -- serialize inserts so the chain never forks
  perform pg_advisory_xact_lock(hashtext('audit_log_chain'));
  select hash into last_hash from public.audit_log order by id desc limit 1;
  new.prev_hash := coalesce(last_hash, 'GENESIS');
  new.created_at := now();
  new.hash := encode(digest(
    new.prev_hash || '|' || new.event_type || '|' || new.entity_type || '|' ||
    coalesce(new.entity_id, '') || '|' || new.payload::text || '|' ||
    coalesce(new.actor::text, '') || '|' || new.created_at::text,
    'sha256'), 'hex');
  return new;
end;
$$;

create trigger audit_log_chain_trigger
  before insert on public.audit_log
  for each row execute function public.audit_log_chain();

-- append-only: no updates or deletes, ever
create or replace function public.audit_log_immutable()
returns trigger language plpgsql as $$
begin
  raise exception 'audit_log is append-only';
end;
$$;

create trigger audit_log_no_update before update or delete on public.audit_log
  for each row execute function public.audit_log_immutable();

-- ============================================================
-- Row-level security
-- ============================================================
alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.vision_profiles enable row level security;
alter table public.topics enable row level security;
alter table public.contributions enable row level security;
alter table public.decisions enable row level security;
alter table public.decision_inputs enable row level security;
alter table public.audit_log enable row level security;

-- profiles: everyone signed-in can see the circle; you edit only yourself
create policy "profiles are visible to members" on public.profiles
  for select to authenticated using (true);
create policy "users update own profile" on public.profiles
  for update to authenticated using (auth.uid() = id);

-- conversations & messages: private to their owner
create policy "own conversations" on public.conversations
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own messages" on public.messages
  for all to authenticated
  using (exists (select 1 from public.conversations c
                 where c.id = conversation_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.conversations c
                      where c.id = conversation_id and c.user_id = auth.uid()));

-- vision profiles: owner reads/writes own; confirmed profiles visible to members (transparency)
create policy "own vision profile" on public.vision_profiles
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "confirmed visions visible to members" on public.vision_profiles
  for select to authenticated using (status = 'confirmed');

-- topics: members read; facilitators/admins manage (via service role in v0)
create policy "topics visible to members" on public.topics
  for select to authenticated using (true);

-- contributions: members read all (the collective conversation is open); write own
create policy "contributions visible to members" on public.contributions
  for select to authenticated using (true);
create policy "members add own contributions" on public.contributions
  for insert to authenticated with check (auth.uid() = user_id);

-- decisions: open to members (in the open, in the light)
create policy "decisions visible to members" on public.decisions
  for select to authenticated using (true);

-- decision inputs: owner writes own; confirmed inputs visible to members
create policy "own decision inputs" on public.decision_inputs
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "confirmed inputs visible to members" on public.decision_inputs
  for select to authenticated using (confirmed = true);

-- audit log: readable by every member; writes only via service role / triggers
create policy "audit log readable by members" on public.audit_log
  for select to authenticated using (true);
