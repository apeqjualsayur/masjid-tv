-- =====================================================================
-- 0012 — Enhancements: activity notices, Islamic events, imam & bilal roster
-- Spec: _specs/60-PRD-enhancements.md §7.3, §9 · source: _specs/62-enhancements-migration.sql
-- =====================================================================
-- Additive only: TVs on the old app keep working (they ignore the new bundle keys and drop
-- slides with template keys they do not know).
-- One Supabase project only ("masjidview-dev" IS production, PRD D11): take a backup, then apply once.
--
-- 1. slides: 3 new template keys; fields.notice shape (kuliah/program/mesyuarat only).
--    The template_key check is found by its definition, not by name (the live name could not be
--    read when this was written; Postgres' default would be slides_template_key_check).
-- 2. islamic_events (platform takwim) — any change bumps every ACTIVE masjid's bundle.
-- 3. petugas (imam / bilal names, max 40 per masjid).
-- 4. roster_slots (day × all-day|waktu × role → petugas).
-- 5. RLS for petugas and roster_slots.
-- 6. roster_save(org, slots): replaces a masjid's whole grid in one transaction.
-- 7. bundle_islamic_events(), bundle_roster(org) + screen_bundle: the 0011 definition with two
--    new keys in the 'ok' reply ('islamicEvents', 'roster'). Nothing else in it changes: same
--    signature (4 args incl. p_view_mode), 'unchanged' path, usage telemetry, screen.sound.
-- 8. Grants: helpers/trigger functions not callable by anon/authenticated; roster_save by
--    authenticated only.
-- Run as one transaction (SQL editor: paste all, Run).
begin;

-- ---------------------------------------------------------------------
-- 1. Slides: three new template keys + notice shape
-- ---------------------------------------------------------------------
do $$
declare c record; n int := 0;
begin
  for c in
    select conname from pg_constraint
     where conrelid = 'public.slides'::regclass and contype = 'c'
       and pg_get_constraintdef(oid) like '%template_key = ANY%'
  loop
    execute format('alter table public.slides drop constraint %I', c.conname);
    raise notice 'dropped template_key check %', c.conname;
    n := n + 1;
  end loop;
  if n <> 1 then
    raise exception 'expected exactly one template_key list check on slides, found %', n;
  end if;
end $$;

alter table public.slides add constraint slides_template_key_check check (template_key in (
  'pengumuman','kuliah','kematian','program','infaq','mesyuarat','imam_bilal','kewangan','ayat','ucapan',
  'penangguhan','hari_kebesaran','jadual_petugas'));

-- fields.notice: only on kuliah/program/mesyuarat; kind tangguh|batal; reason <= 100 chars;
-- newAt only for tangguh.
alter table public.slides add constraint slides_notice_shape check (
  not (fields ? 'notice')
  or (
    template_key in ('kuliah', 'program', 'mesyuarat')
    and jsonb_typeof(fields -> 'notice') = 'object'
    and (fields -> 'notice' ->> 'kind') in ('tangguh', 'batal')
    and coalesce(char_length(fields -> 'notice' ->> 'reason'), 0) <= 100
    and (fields -> 'notice' ->> 'kind' = 'tangguh'
         or coalesce(jsonb_typeof(fields -> 'notice' -> 'newAt'), 'null') = 'null')
  )
);

-- ---------------------------------------------------------------------
-- 2. Islamic events (platform-wide takwim, filled by the platform owner)
-- ---------------------------------------------------------------------
create table public.islamic_events (
  id          uuid primary key default gen_random_uuid(),
  event_key   text not null check (event_key in (
                'awal_muharram','maulidur_rasul','israk_mikraj','nisfu_syaaban','awal_ramadan',
                'nuzul_quran','aidilfitri','hari_arafah','aidiladha')),
  hijri_year  int  not null check (hijri_year between 1440 and 1600),
  greg_date   date not null,
  status      text not null default 'jangkaan' check (status in ('jangkaan', 'rasmi')),
  note        text check (char_length(note) <= 120),
  updated_by  uuid references auth.users on delete set null,
  updated_at  timestamptz not null default now(),
  unique (event_key, hijri_year)
);
create index islamic_events_date_idx on public.islamic_events (greg_date);

alter table public.islamic_events enable row level security;
create policy ie_select on public.islamic_events for select to authenticated using (true);
create policy ie_insert on public.islamic_events for insert to authenticated
  with check (public.is_platform_admin());
create policy ie_update on public.islamic_events for update to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy ie_delete on public.islamic_events for delete to authenticated
  using (public.is_platform_admin());

create or replace function public.islamic_events_before_write()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;
create trigger islamic_events_before_write before insert or update on public.islamic_events
  for each row execute function public.islamic_events_before_write();

-- Any takwim change reaches every active masjid's TVs on their next sync.
create or replace function public.islamic_events_after_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update organisations set bundle_version = bundle_version + 1 where status = 'active';
  return null;
end $$;
create trigger islamic_events_after_change after insert or update or delete on public.islamic_events
  for each statement execute function public.islamic_events_after_change();

-- ---------------------------------------------------------------------
-- 3. Petugas (imam / bilal names per masjid)
-- ---------------------------------------------------------------------
create table public.petugas (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organisations on delete cascade,
  name        text not null check (char_length(trim(name)) between 2 and 60),
  title       text check (char_length(title) <= 20),
  roles       text[] not null default '{imam}'
              check (cardinality(roles) between 1 and 2 and roles <@ array['imam','bilal']::text[]),
  active      boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index petugas_org_idx on public.petugas (org_id, sort_order);

create trigger petugas_touch before update on public.petugas
  for each row execute function public.touch_updated_at();

-- org fixed; max 40 per masjid (locks the org row so two inserts cannot race)
create or replace function public.petugas_before_write()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.org_id <> old.org_id then
    raise exception 'org_change_not_allowed' using errcode = '42501';
  end if;
  if tg_op = 'INSERT' then
    perform 1 from organisations where id = new.org_id for update;
    if (select count(*) from petugas where org_id = new.org_id) >= 40 then
      raise exception 'petugas_full' using errcode = 'P0001';
    end if;
  end if;
  new.name := trim(new.name);
  new.title := nullif(trim(new.title), '');
  return new;
end $$;
create trigger petugas_before_write before insert or update on public.petugas
  for each row execute function public.petugas_before_write();

-- ---------------------------------------------------------------------
-- 4. Roster slots: day x (all-day | waktu) x role -> petugas
-- ---------------------------------------------------------------------
create table public.roster_slots (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organisations on delete cascade,
  day_of_week smallint not null check (day_of_week between 1 and 7),          -- 1 = Isnin … 7 = Ahad
  waktu       text check (waktu in ('subuh','zohor','asar','maghrib','isyak')),  -- null = sepanjang hari
  role        text not null check (role in ('imam','bilal')),
  petugas_id  uuid not null references public.petugas on delete cascade,
  created_at  timestamptz not null default now()
);
create unique index roster_slots_uniq on public.roster_slots (org_id, day_of_week, coalesce(waktu, '*'), role);
create index roster_slots_petugas_idx on public.roster_slots (petugas_id);

-- a slot must point to a petugas of the same masjid that has this role
create or replace function public.roster_slots_check()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from petugas p
                  where p.id = new.petugas_id and p.org_id = new.org_id and new.role = any (p.roles)) then
    raise exception 'bad_petugas' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger roster_slots_check before insert or update on public.roster_slots
  for each row execute function public.roster_slots_check();

-- petugas changes: drop slots for a removed role; bump the masjid's bundle
create or replace function public.petugas_after_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' then
    delete from roster_slots where petugas_id = new.id and not (role = any (new.roles));
  end if;
  perform public.bump_org_version(coalesce(new.org_id, old.org_id));
  return null;
end $$;
create trigger petugas_after_change after insert or update or delete on public.petugas
  for each row execute function public.petugas_after_change();

-- ---------------------------------------------------------------------
-- 5. RLS for petugas and roster_slots
-- ---------------------------------------------------------------------
alter table public.petugas      enable row level security;
alter table public.roster_slots enable row level security;

create policy petugas_select on public.petugas for select to authenticated
  using (public.is_member(org_id) or public.is_platform_admin());
create policy petugas_insert on public.petugas for insert to authenticated
  with check (public.is_pentadbir(org_id) and public.is_active_org(org_id));
create policy petugas_update on public.petugas for update to authenticated
  using (public.is_pentadbir(org_id) and public.is_active_org(org_id))
  with check (public.is_pentadbir(org_id) and public.is_active_org(org_id));
create policy petugas_delete on public.petugas for delete to authenticated
  using (public.is_pentadbir(org_id));

create policy roster_select on public.roster_slots for select to authenticated
  using (public.is_member(org_id) or public.is_platform_admin());
-- no insert/update/delete policies: written only by roster_save()

-- ---------------------------------------------------------------------
-- 6. roster_save: replace a masjid's whole grid in one transaction
--    p_slots = [{"day":1,"waktu":null,"role":"imam","petugasId":"<uuid>"}, …]  (max 100)
--    Any bad slot raises, so the delete is rolled back and the previous grid stays.
-- ---------------------------------------------------------------------
create or replace function public.roster_save(p_org uuid, p_slots jsonb)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not public.is_pentadbir(p_org) or not public.is_active_org(p_org) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_slots is null or jsonb_typeof(p_slots) <> 'array' or jsonb_array_length(p_slots) > 100 then
    raise exception 'bad_slots' using errcode = 'P0001';
  end if;
  delete from roster_slots where org_id = p_org;
  insert into roster_slots (org_id, day_of_week, waktu, role, petugas_id)
  select p_org, (x ->> 'day')::smallint, nullif(x ->> 'waktu', ''), x ->> 'role', (x ->> 'petugasId')::uuid
    from jsonb_array_elements(p_slots) x;
  get diagnostics n = row_count;
  perform public.bump_org_version(p_org);
  return n;
end $$;

-- ---------------------------------------------------------------------
-- 7. Bundle helpers (called from screen_bundle, which is SECURITY DEFINER)
-- ---------------------------------------------------------------------
create or replace function public.bundle_islamic_events()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'key', e.event_key, 'hijriYear', e.hijri_year, 'date', e.greg_date, 'status', e.status)
           order by e.greg_date), '[]'::jsonb)
    from islamic_events e
   where e.greg_date >= (now() at time zone 'Asia/Kuala_Lumpur')::date - 40
     and e.greg_date <= (now() at time zone 'Asia/Kuala_Lumpur')::date + 400;
$$;

create or replace function public.bundle_roster(p_org uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'petugas', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'title', p.title, 'roles', to_jsonb(p.roles))
                       order by p.sort_order, p.name)
        from petugas p where p.org_id = p_org and p.active), '[]'::jsonb),
    'slots', coalesce((
      select jsonb_agg(jsonb_build_object('day', r.day_of_week, 'waktu', r.waktu, 'role', r.role, 'petugasId', r.petugas_id)
                       order by r.day_of_week, r.waktu nulls first, r.role)
        from roster_slots r join petugas p on p.id = r.petugas_id and p.active
       where r.org_id = p_org), '[]'::jsonb));
$$;

-- screen_bundle: the 0011 definition; the 'ok' reply gains 'islamicEvents' and 'roster'.
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
    ), '[]'::jsonb),
    'islamicEvents', public.bundle_islamic_events(),
    'roster',        public.bundle_roster(o.id)
  );
  -- usage: count a full bundle
  perform public.usage_note_ping(s.id, o.id, true, octet_length(v_out::text));
  return v_out;
end $$;

-- ---------------------------------------------------------------------
-- 8. Grants (Supabase grants EXECUTE to anon/authenticated by default: revoke, then allow)
--    screen_bundle keeps its existing grants (create or replace, same signature).
-- ---------------------------------------------------------------------
revoke execute on function
  public.islamic_events_before_write(), public.islamic_events_after_change(),
  public.petugas_before_write(), public.petugas_after_change(), public.roster_slots_check(),
  public.bundle_islamic_events(), public.bundle_roster(uuid), public.roster_save(uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.roster_save(uuid, jsonb) to authenticated;

commit;

-- Check after running (optional):
--   select conname, pg_get_constraintdef(oid) from pg_constraint
--    where conrelid = 'public.slides'::regclass and conname in ('slides_template_key_check', 'slides_notice_shape');
--   select count(*) from public.islamic_events;                    -- 0 until the takwim is filled in
--   select public.bundle_islamic_events();                         -- []
