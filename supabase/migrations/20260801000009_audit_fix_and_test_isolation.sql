-- Two fixes: a broken audit trail, and test accounts polluting the collective.
--
-- 1. AUDIT LOG HAS NEVER RECORDED ANYTHING.
--    audit_log_chain() calls digest() (pgcrypto), but pins search_path to
--    'public'. On Supabase pgcrypto lives in the `extensions` schema, so every
--    insert failed with "function digest(text, unknown) does not exist". The
--    app logs that error and moves on, so it failed silently: the audit_log
--    table is empty, and the "open record" page has been showing nothing.
--
-- 2. TEST ACCOUNTS ARE INDISTINGUISHABLE FROM REAL MEMBERS.
--    profiles.is_test has existed since 20260702000004 but nothing ever set it.
--    Now it is set at signup from auth metadata, and the app filters on it.

-- ------------------------------------------------------------------
-- 1. Make the hash chain work
-- ------------------------------------------------------------------
create or replace function public.audit_log_chain()
returns trigger
language plpgsql
security definer set search_path = public, extensions
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

-- ------------------------------------------------------------------
-- 2. Mark test identities at signup
-- ------------------------------------------------------------------
-- is_test comes from client-supplied auth metadata, so a member could in
-- principle mark themselves as a test account. That only ever removes them
-- from the collective picture — it grants nothing — so it is not a privilege
-- boundary. Keepers can correct any profile from /keeper/members.
-- Compared as text rather than cast to boolean so unexpected metadata can
-- never raise and break signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, is_test)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data ->> 'is_test') in ('true', 't', '1'), false)
  );
  return new;
end;
$$;

-- ------------------------------------------------------------------
-- 3. Stop members editing their own role / test flag
-- ------------------------------------------------------------------
-- "users update own profile" allows UPDATE on the whole row, so a member could
-- set their own role to 'admin' or clear their own is_test flag. RLS can't
-- restrict columns, so use column-level grants: display_name is theirs to
-- change, joined_from is written by /api/context under their session, and
-- everything else (role, is_test, email, id) is keeper/service-role only.
revoke update on public.profiles from authenticated;
grant update (display_name, joined_from) on public.profiles to authenticated;
