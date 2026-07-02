-- Coarse, disclosed context captured at entry (no action required from the member).
-- Deliberately approximate: city-level geo from IP, timezone, language, device type.
-- We do NOT store IP addresses, precise coordinates, or fingerprints.
alter table public.profiles add column if not exists joined_from jsonb;
