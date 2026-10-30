-- =====================================================================
-- 0010 — TV full-screen status + admin feedback
-- =====================================================================
-- 1. screens.view_mode: how the TV is shown, reported by the TV on every sync:
--      'app'    kiosk browser / installed app: full screen that survives a reload
--      'tab'    browser full screen (the TV's "press OK"): lost on reload, so the TV skips its
--               nightly reload and needs one press (or off/on) to load a new version
--      'window' not full screen (browser bars visible)
--    Changing it does not bump bundle_version (screens_after_change ignores it), so no extra sync.
-- 2. screen_bundle() gains p_view_mode (default null). Old TVs keep calling it with 3 arguments.
--    The 3-argument version is dropped in the same transaction (two overloads would make the
--    PostgREST call ambiguous). New TVs fall back to the 3-argument call if this has not run yet.
-- 3. feedback: masjid admins send feedback (send_feedback); each sender reads only their own;
--    platform owners read all with masjid and sender e-mail (platform_feedback). No replies.
-- Run as one transaction (SQL editor: paste all, Run).
begin;

-- ---------------------------------------------------------------------
-- 1. screens.view_mode
-- ---------------------------------------------------------------------
alter table public.screens add column if not exists view_mode text
  check (view_mode in ('app', 'tab', 'window'));

-- ---------------------------------------------------------------------
-- 2. screen_bundle() with p_view_mode (only the screens update changed vs 0008)
-- ---------------------------------------------------------------------
drop function if exists public.screen_bundle(text, bigint, text);
create function public.screen_bundle(p_secret text, p_since bigint default 0, p_app_version text default null, p_view_mode text default null)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare v_hash text := public.secret_hash(p_secret); s screens; o organisations; st org_settings; v_out jsonb;
        v_mode text := case when p_view_mode in ('app', 'tab', 'window') then p_view_mode end;
begin
  select * into s from screens where device_secret_hash = v_hash;
  if not found or s.revoked_at is not null then
    return jsonb_build_object('status', 'revoked');
  end if;
  select * into o from organisations where id = s.org_id;
  if o.status <> 'active' then
    return jsonb_build_object('status', 'suspended');
  end if;

  if s.last_seen_at is null or s.last_seen_at < now() - interval '60 seconds'
     or s.app_version is distinct from p_app_version
     or (v_mode is not null and s.view_mode is distinct from v_mode) then
    update screens set last_seen_at = now(), app_version = coalesce(p_app_version, app_version),
                       view_mode = coalesce(v_mode, view_mode)
     where id = s.id;
  end if;

  if o.bundle_version <= coalesce(p_since, 0) then
    v_out := jsonb_build_object('status', 'unchanged', 'version', o.bundle_version);
    -- usage: count an "unchanged" reply
    perform public.usage_note_ping(s.id, o.id, false, octet_length(v_out::text));
    return v_out;
  end if;

  select * into st from org_settings where org_id = o.id;

  v_out := jsonb_build_object(
    'status', 'ok',
    'version', o.bundle_version,
    'screen', jsonb_build_object('id', s.id, 'name', s.name, 'theme', s.theme, 'layout', s.layout),
    'org', jsonb_build_object('fullName', o.full_name, 'shortName', o.short_name, 'kind', o.kind,
                              'zone', o.zone, 'accentColor', o.accent_color, 'logoPath', o.logo_path),
    'settings', jsonb_build_object('iqamahMin', st.iqamah_min, 'durations', st.durations,
                                   'clock24h', st.clock_24h, 'showArabic', st.show_arabic, 'ticker', st.ticker),
    'slides', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', sl.id, 'type', sl.type, 'templateKey', sl.template_key, 'fields', sl.fields,
               'startsAt', sl.starts_at, 'endsAt', sl.ends_at, 'durationS', sl.duration_s,
               'daysOfWeek', sl.days_of_week, 'priority', sl.priority, 'sortOrder', sl.sort_order,
               'media', case when m.id is null then null else
                          jsonb_build_object('path', m.path, 'width', m.width, 'height', m.height) end)
             order by sl.sort_order, sl.created_at)
        from slides sl
        left join media m on m.id = sl.media_id
       where sl.org_id = o.id
         and sl.status = 'published'
         and (sl.ends_at is null or sl.ends_at > now())
         and sl.starts_at < now() + interval '7 days'
         and (sl.screen_ids is null or s.id = any (sl.screen_ids))
    ), '[]'::jsonb)
  );
  -- usage: count a full bundle
  perform public.usage_note_ping(s.id, o.id, true, octet_length(v_out::text));
  return v_out;
end $$;
revoke execute on function public.screen_bundle(text, bigint, text, text) from public;
grant execute on function public.screen_bundle(text, bigint, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. feedback
-- ---------------------------------------------------------------------
create table if not exists public.feedback (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid references public.organisations(id) on delete set null,
  user_id     uuid not null references auth.users(id) on delete cascade,
  message     text not null check (char_length(message) between 1 and 2000),
  page        text check (char_length(page) <= 200),
  app_version text check (char_length(app_version) <= 60),
  created_at  timestamptz not null default now()
);
create index if not exists feedback_created_idx on public.feedback (created_at desc);
create index if not exists feedback_user_idx on public.feedback (user_id, created_at desc);
alter table public.feedback enable row level security;
-- Each sender reads their own feedback; nobody writes the table directly (send_feedback only).
drop policy if exists feedback_select_own on public.feedback;
create policy feedback_select_own on public.feedback for select to authenticated using (user_id = auth.uid());
revoke all on public.feedback from anon;
revoke insert, update, delete on public.feedback from authenticated;

/** Send one feedback. Members of p_org only (p_org null = account without a masjid). 20 per user per day. */
create or replace function public.send_feedback(p_org uuid, p_message text, p_page text default null, p_app_version text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_msg text := btrim(coalesce(p_message, '')); v_id uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_org is not null and not public.is_member(p_org) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if v_msg = '' then raise exception 'empty_message' using errcode = 'P0001'; end if;
  if char_length(v_msg) > 2000 then raise exception 'too_long' using errcode = 'P0001'; end if;
  if (select count(*) from feedback where user_id = auth.uid() and created_at > now() - interval '1 day') >= 20 then
    raise exception 'too_many' using errcode = 'P0001';
  end if;
  insert into feedback (org_id, user_id, message, page, app_version)
  values (p_org, auth.uid(), v_msg, left(p_page, 200), left(p_app_version, 60))
  returning id into v_id;
  return v_id;
end $$;

/** All feedback, newest first, with the masjid and the sender's e-mail. Platform owners only. */
create or replace function public.platform_feedback(p_limit int default 300)
returns table (id uuid, created_at timestamptz, message text, page text, app_version text,
               org_id uuid, org_name text, sender_email text)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  if not public.is_platform_admin() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  return query
  select f.id, f.created_at, f.message, f.page, f.app_version, f.org_id, o.full_name, u.email::text
    from feedback f
    left join organisations o on o.id = f.org_id
    left join auth.users u on u.id = f.user_id
   order by f.created_at desc
   limit greatest(1, least(coalesce(p_limit, 300), 1000));
end $$;

revoke execute on function public.send_feedback(uuid, text, text, text), public.platform_feedback(int) from public, anon;
grant execute on function public.send_feedback(uuid, text, text, text), public.platform_feedback(int) to authenticated;

commit;

-- Verify afterwards (run separately):
--   select column_name from information_schema.columns where table_name = 'screens' and column_name = 'view_mode';
--   select pg_get_function_identity_arguments(oid) from pg_proc where proname = 'screen_bundle';
--     → one row: p_secret text, p_since bigint, p_app_version text, p_view_mode text
--   select count(*) from public.feedback;   -- 0
