-- =====================================================================
-- 0011 — TV sound cues per screen (_specs/50-PRD-sound.md D1, D4, D8)
-- =====================================================================
-- 1. screens.sound: { enabled, volume 0–100 (integer), azan, iqamah } with the kinds
--    off | beep | chime | alarm | hayya. Default OFF for every screen, existing and new. A check
--    constraint keeps exactly those four keys with valid values.
--    Adding the column does not fire screens_after_change (DDL), so no TV re-syncs because of it.
-- 2. screens_after_change (latest: 0001): a change to sound bumps bundle_version, like name, theme,
--    layout and revoked_at. last_seen_at / app_version / view_mode still do not.
-- 3. screen_bundle (latest: 0010): the 'screen' object also carries 'sound'. Everything else is the
--    0010 definition unchanged. Same signature, so create or replace: grants stay as they are.
-- No grant, RLS policy or other function changes. Run as one transaction (SQL editor: paste all, Run).
begin;

-- ---------------------------------------------------------------------
-- 1. screens.sound
-- ---------------------------------------------------------------------
alter table public.screens add column if not exists sound jsonb not null
  default '{"enabled":false,"volume":70,"azan":"chime","iqamah":"hayya"}'::jsonb;

-- CASE evaluates in order, so each test only runs once the earlier ones hold (e.g. removing keys
-- from a non-object would raise instead of failing the check).
alter table public.screens drop constraint if exists screens_sound_valid;
alter table public.screens add constraint screens_sound_valid check (
  case
    when jsonb_typeof(sound) is distinct from 'object' then false
    when not (sound ?& array['enabled', 'volume', 'azan', 'iqamah']) then false
    when (sound - array['enabled', 'volume', 'azan', 'iqamah']) <> '{}'::jsonb then false
    when jsonb_typeof(sound -> 'enabled') <> 'boolean' then false
    when jsonb_typeof(sound -> 'volume') <> 'number' or (sound ->> 'volume') !~ '^[0-9]{1,3}$' then false
    when (sound ->> 'azan') not in ('off', 'beep', 'chime', 'alarm', 'hayya') then false
    when (sound ->> 'iqamah') not in ('off', 'beep', 'chime', 'alarm', 'hayya') then false
    else (sound ->> 'volume')::int between 0 and 100
  end
);

-- ---------------------------------------------------------------------
-- 2. screens_after_change: sound is display-relevant (0001 + sound)
-- ---------------------------------------------------------------------
create or replace function public.screens_after_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE'
     and (new.name, new.theme, new.layout, new.revoked_at, new.sound) is not distinct from
         (old.name, old.theme, old.layout, old.revoked_at, old.sound) then
    return null;   -- last_seen_at / app_version / view_mode only: no bump
  end if;
  perform public.bump_org_version(coalesce(new.org_id, old.org_id));
  return null;
end $$;

-- ---------------------------------------------------------------------
-- 3. screen_bundle: 0010 definition, the 'screen' object gains 'sound'
-- ---------------------------------------------------------------------
create or replace function public.screen_bundle(p_secret text, p_since bigint default 0, p_app_version text default null, p_view_mode text default null)
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
    'screen', jsonb_build_object('id', s.id, 'name', s.name, 'theme', s.theme, 'layout', s.layout, 'sound', s.sound),
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

commit;

-- Check after running (optional):
--   select count(*) filter (where (sound->>'enabled')::boolean) as sound_on, count(*) as screens from public.screens;
--   → sound_on = 0 right after the migration
