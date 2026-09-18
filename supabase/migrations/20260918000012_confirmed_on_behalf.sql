-- Some people gave a long, real conversation and never reached a draft, because
-- the only way out was a button they never found. Their words existed as raw
-- transcript and nothing else, so their voice was missing from the map.
--
-- A keeper can now draft from that transcript and place it on the map on their
-- behalf — but the record must say so. confirmed_by is null when the person
-- confirmed their own vision (the normal case) and carries the keeper's id when
-- it was done for them. Everything that displays a vision checks this, so
-- "confirmed" never silently means "confirmed by someone else".
alter table public.vision_profiles
  add column if not exists confirmed_by uuid references public.profiles (id);
