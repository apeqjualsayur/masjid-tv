-- =====================================================================
-- 0002 — pair_claim: record failed attempts so the brute-force limit works
-- =====================================================================
-- Problem (found by scripts/rls-check.ts, 2026-10-20): pair_claim inserted a pair_attempts row
-- and then raised 'invalid_code'. Raising rolls back the whole call, so failed attempts were never
-- stored and the "10 failed attempts per user per hour" limit (PRD §10) could not trigger.
-- Change: on a wrong or expired code, record the attempt and RETURN NULL instead of raising.
-- Same signature and return type, so existing grants are kept.
-- Callers: a NULL result means "Kod tidak sah" (wrong or expired code).
create or replace function public.pair_claim(
  p_code text, p_org uuid, p_name text,
  p_theme public.theme_key default 'tenang', p_layout public.layout_key default 'full')
returns uuid language plpgsql security definer set search_path = public as $$
-- Returns the new screen id, or NULL when the code is wrong or expired.
-- A wrong code must NOT raise an exception: that would roll back the pair_attempts row
-- and the 10-per-hour brute-force limit (PRD §10) would never trigger.
declare v_row pairing_codes; v_screen uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not public.is_pentadbir(p_org) or not public.is_active_org(p_org) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if (select count(*) from pair_attempts
       where user_id = auth.uid() and not succeeded and attempted_at > now() - interval '1 hour') >= 10 then
    raise exception 'too_many_attempts' using errcode = 'P0001';
  end if;

  select * into v_row from pairing_codes
   where code = p_code and claimed_at is null and expires_at > now()
   for update;
  if not found then
    insert into pair_attempts (user_id, succeeded) values (auth.uid(), false);
    return null;   -- invalid_code: the admin app shows "Kod tidak sah"
  end if;

  -- a previously revoked screen with the same device secret is replaced
  delete from screens where device_secret_hash = v_row.device_secret_hash and revoked_at is not null;

  insert into screens (org_id, name, theme, layout, device_secret_hash, created_by)
  values (p_org, trim(p_name), p_theme, p_layout, v_row.device_secret_hash, auth.uid())
  returning id into v_screen;
  update pairing_codes set claimed_at = now(), claimed_screen_id = v_screen where id = v_row.id;
  insert into pair_attempts (user_id, succeeded) values (auth.uid(), true);
  return v_screen;
end $$;