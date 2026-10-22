-- =====================================================================
-- 0003 — platform_org_list(): the Platform page's list of masjids
-- =====================================================================
-- The Platform page (PRD §4.3) needs each masjid with its registrant's e-mail, which lives in
-- auth.users (not readable by app users). This SECURITY DEFINER function returns it to platform
-- owners only, with per-masjid screen and storage totals so the page needs one call.
-- Non-owners get 'not_allowed'. Nothing is changed in any table or policy.
create or replace function public.platform_org_list()
returns table (
  id               uuid,
  kind             text,
  full_name        text,
  short_name       text,
  state            text,
  district         text,
  zone             text,
  address          text,
  contact_phone    text,
  logo_path        text,
  accent_color     text,
  status           public.org_status,
  status_reason    text,
  created_at       timestamptz,
  reviewed_at      timestamptz,
  registrant_email text,
  screens_total    int,     -- paired screens that are not revoked
  screens_online   int,     -- of those, seen in the last 3 minutes (PRD §7)
  storage_bytes    bigint   -- sum of media.bytes
)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  if not public.is_platform_admin() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  return query
  select o.id, o.kind, o.full_name, o.short_name, o.state, o.district, o.zone,
         o.address, o.contact_phone, o.logo_path, o.accent_color,
         o.status, o.status_reason, o.created_at, o.reviewed_at,
         u.email::text,
         coalesce(s.total, 0)::int, coalesce(s.online, 0)::int, coalesce(m.bytes, 0)::bigint
    from organisations o
    left join auth.users u on u.id = o.created_by
    left join lateral (
      select count(*) as total,
             count(*) filter (where sc.last_seen_at > now() - interval '3 minutes') as online
        from screens sc
       where sc.org_id = o.id and sc.revoked_at is null
    ) s on true
    left join lateral (
      select sum(md.bytes) as bytes from media md where md.org_id = o.id
    ) m on true
   order by o.created_at desc;
end $$;

-- Supabase grants EXECUTE on new functions to anon by default: allow signed-in users only
-- (the function itself then rejects anyone who is not a platform owner).
revoke execute on function public.platform_org_list() from public, anon;
grant execute on function public.platform_org_list() to authenticated;