-- =====================================================================
-- 0005 — reorder_slides(): save the playlist order in one request
-- =====================================================================
-- The Kandungan page lets AJK drag slides into a new order. PostgREST cannot update many rows
-- with different values in one call, so this function writes sort_order = position in p_ids for
-- the given slides in a single statement.
-- SECURITY INVOKER (the default): it runs as the signed-in user, so the existing slides_update
-- RLS policy (member of an active masjid) decides, exactly as for a normal update. Rows of other
-- masjids are never touched (org_id filter + RLS). No table or policy changes.
create or replace function public.reorder_slides(p_org uuid, p_ids uuid[])
returns int language plpgsql security invoker set search_path = public as $$
declare v_count int;
begin
  if not public.is_member(p_org) or not public.is_active_org(p_org) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  update slides s
     set sort_order = x.ord::int
    from unnest(p_ids) with ordinality as x(id, ord)
   where s.id = x.id
     and s.org_id = p_org
     and s.sort_order is distinct from x.ord::int;
  get diagnostics v_count = row_count;
  return v_count;
end $$;

revoke execute on function public.reorder_slides(uuid, uuid[]) from public, anon;
grant execute on function public.reorder_slides(uuid, uuid[]) to authenticated;