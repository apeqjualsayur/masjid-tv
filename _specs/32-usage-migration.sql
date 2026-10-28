-- =====================================================================
-- Masjid View — migration: usage monitoring for the Platform page (v0.1)
-- Adds: TV sync telemetry, usage settings + limits, hourly snapshots,
--       email counts, calibration against the Supabase Usage page,
--       alert bookkeeping, and the platform_usage() report.
-- Save as supabase/migrations/00NN_usage.sql (next free number).
-- Run on masjidview-dev first, then masjidview-prod.
-- Section 4 replaces screen_bundle(). It is written against the version in
-- _specs/11-schema.sql §7. If the live function differs, merge the two
-- marked "usage:" blocks into the live version instead (see prompt U1).
-- Tested on Postgres 16 with a Supabase-like schema.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Settings, limits and prices (single row; edited from the Platform page)
--    Sizes are decimal bytes (1 GB = 1e9) to match Supabase's usage page.
-- ---------------------------------------------------------------------
create table public.usage_settings (
  id                     boolean primary key default true check (id),
  cycle_day              smallint not null default 1 check (cycle_day between 1 and 28),
  plan                   text not null default 'free' check (plan in ('free', 'pro')),
  compute                text not null default 'nano' check (compute in ('nano', 'micro', 'small', 'medium', 'large')),
  resend_plan            text not null default 'free' check (resend_plan in ('free', 'pro')),
  poll_seconds           int  not null default 60 check (poll_seconds between 15 and 600),
  http_overhead_bytes    int  not null default 450 check (http_overhead_bytes between 0 and 5000),
  admin_bytes_per_month  bigint not null default 5000000 check (admin_bytes_per_month >= 0),
  fx_rm_per_usd          numeric(6,3) not null default 4.200 check (fx_rm_per_usd > 0),
  domain_rm_per_year     numeric(8,2) not null default 130 check (domain_rm_per_year >= 0),
  backup_upgrade_at      int  not null default 25 check (backup_upgrade_at >= 0),
  alert_warn_pct         int  not null default 70 check (alert_warn_pct between 10 and 99),
  alert_crit_pct         int  not null default 90 check (alert_crit_pct between 10 and 100),
  limits                 jsonb not null default '{
    "free":  {"db_bytes": 500000000,  "storage_bytes": 1000000000,   "egress_bytes": 5000000000,
              "cached_egress_bytes": 5000000000,   "mau": 50000,  "rps": 3},
    "pro":   {"db_bytes": 8000000000, "storage_bytes": 100000000000, "egress_bytes": 250000000000,
              "cached_egress_bytes": 250000000000, "mau": 100000, "rps": 10},
    "resend_free": {"emails_month": 3000,  "emails_day": 100},
    "resend_pro":  {"emails_month": 50000, "emails_day": null}
  }',
  prices                 jsonb not null default '{
    "supabase_pro_usd": 25, "compute_credit_usd": 10,
    "egress_usd_per_gb": 0.09, "cached_egress_usd_per_gb": 0.03,
    "storage_usd_per_gb": 0.021, "db_usd_per_gb": 0.125,
    "resend_pro_usd": 20,
    "compute": {"nano": {"usd": 0, "rps": 3}, "micro": {"usd": 10, "rps": 10}, "small": {"usd": 15, "rps": 30},
                "medium": {"usd": 60, "rps": 80}, "large": {"usd": 110, "rps": 200}}
  }',
  prices_checked_on      date not null default date '2026-10-23',
  updated_at             timestamptz not null default now()
);
insert into public.usage_settings default values;

-- ---------------------------------------------------------------------
-- 2. Telemetry and snapshot tables (no foreign keys: history survives deletes)
-- ---------------------------------------------------------------------
-- One row per screen per Malaysian day, updated by screen_bundle().
create table public.usage_screen_daily (
  day          date   not null,
  screen_id    uuid   not null,
  org_id       uuid   not null,
  pings        int    not null default 0,
  full_bundles int    not null default 0,
  bytes_out    bigint not null default 0,      -- estimated response bytes incl. HTTP overhead
  first_seen   timestamptz not null default now(),
  last_seen    timestamptz not null default now(),
  primary key (day, screen_id)
);
create index usage_screen_daily_org_idx on public.usage_screen_daily (org_id, day);

-- Emails sent per Malaysian day, counted from the Resend API by the usage-digest Edge Function.
create table public.usage_email_daily (
  day       date primary key,
  sent      int not null default 0 check (sent >= 0),
  synced_at timestamptz not null default now()
);

-- Hourly snapshot of the whole platform (kept forever; ~1 small row per day).
create table public.usage_daily (
  day             date primary key,
  db_bytes        bigint not null,
  storage_bytes   bigint not null,
  storage_objects int    not null,
  orgs_active     int    not null,
  orgs_seen       int    not null,   -- active masjids with at least one TV ping that day
  screens_total   int    not null,
  screens_seen    int    not null,
  pings           bigint not null,
  full_bundles    bigint not null,
  bundle_bytes    bigint not null,
  mau_30d         int    not null,
  emails          int    not null,
  updated_at      timestamptz not null default now()
);

-- Actual figures copied by the owner from Supabase → Usage, to correct the estimates.
create table public.usage_calibration (
  id               bigserial primary key,
  cycle_start      date not null,
  measured_on      date not null,
  egress_gb        numeric(12,3) not null check (egress_gb >= 0),
  cached_egress_gb numeric(12,3) check (cached_egress_gb >= 0),
  est_egress_bytes bigint not null,
  est_cached_bytes bigint not null,
  note             text check (char_length(note) <= 200),
  created_by       uuid,
  created_at       timestamptz not null default now()
);

-- One alert email per metric per level per billing cycle.
create table public.usage_alerts (
  cycle_start date not null,
  metric      text not null,
  level       text not null check (level in ('warn', 'crit')),
  sent_at     timestamptz not null default now(),
  primary key (cycle_start, metric, level)
);

alter table public.usage_settings     enable row level security;
alter table public.usage_screen_daily enable row level security;
alter table public.usage_email_daily  enable row level security;
alter table public.usage_daily        enable row level security;
alter table public.usage_calibration  enable row level security;
alter table public.usage_alerts       enable row level security;
-- No policies: everything goes through the functions below.

-- ---------------------------------------------------------------------
-- 3. Internal helpers
-- ---------------------------------------------------------------------
create or replace function public.usage_today()
returns date language sql stable as $$
  select (now() at time zone 'Asia/Kuala_Lumpur')::date;
$$;

-- Billing cycle containing p_day, from usage_settings.cycle_day.
create or replace function public.usage_cycle(p_day date default null, out cycle_start date, out cycle_end date)
language plpgsql stable security definer set search_path = public as $$
declare v_day date := coalesce(p_day, public.usage_today()); v_d int;
begin
  select cycle_day into v_d from usage_settings;
  cycle_start := make_date(extract(year from v_day)::int, extract(month from v_day)::int, v_d);
  if cycle_start > v_day then cycle_start := (cycle_start - interval '1 month')::date; end if;
  cycle_end := (cycle_start + interval '1 month')::date;   -- exclusive
end $$;

-- Called from screen_bundle(); never raises.
create or replace function public.usage_note_ping(p_screen uuid, p_org uuid, p_full boolean, p_body_bytes int)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into usage_screen_daily as u (day, screen_id, org_id, pings, full_bundles, bytes_out)
  values (public.usage_today(), p_screen, p_org, 1, case when p_full then 1 else 0 end,
          p_body_bytes + coalesce((select http_overhead_bytes from usage_settings), 450))
  on conflict (day, screen_id) do update
     set pings        = u.pings + 1,
         full_bundles = u.full_bundles + excluded.full_bundles,
         bytes_out    = u.bytes_out + excluded.bytes_out,
         last_seen    = now();
exception when others then
  null;   -- telemetry must never break the TV
end $$;

-- Estimated Supabase egress for Malaysian days p_from..p_to (inclusive).
--   egress        = TV sync responses + admin app share
--   cached_egress = each poster/logo downloaded once per TV that was online
create or replace function public.usage_estimate(p_from date, p_to date,
  out bundle_bytes bigint, out admin_bytes bigint, out egress_bytes bigint, out cached_bytes bigint)
language plpgsql stable security definer set search_path = public, auth as $$
declare
  v_from timestamptz := p_from::timestamp at time zone 'Asia/Kuala_Lumpur';
  v_to   timestamptz := (p_to + 1)::timestamp at time zone 'Asia/Kuala_Lumpur';
  v_admins int; v_per_month bigint;
begin
  select coalesce(sum(d.bytes_out), 0) into bundle_bytes
    from usage_screen_daily d where d.day between p_from and p_to;

  select admin_bytes_per_month into v_per_month from usage_settings;
  select count(distinct m.user_id) into v_admins
    from members m join auth.users u on u.id = m.user_id
   where u.last_sign_in_at >= v_from;
  admin_bytes := (v_admins * v_per_month * ((p_to - p_from + 1) / 30.0))::bigint;
  egress_bytes := bundle_bytes + admin_bytes;

  -- new media × screens of that masjid seen in the period
  -- + every file of a masjid × screens paired in the period (first download)
  select coalesce(sum(m.bytes::bigint * (select count(distinct d.screen_id)
                                    from usage_screen_daily d
                                   where d.org_id = m.org_id and d.day between p_from and p_to)), 0)
       + coalesce((select sum(m2.bytes::bigint)
                     from screens s join media m2 on m2.org_id = s.org_id and m2.created_at < v_from
                    where s.created_at >= v_from and s.created_at < v_to), 0)
    into cached_bytes
    from media m
   where m.created_at >= v_from and m.created_at < v_to;
end $$;

-- ---------------------------------------------------------------------
-- 4. screen_bundle() with telemetry (the two "usage:" blocks are the only change)
-- ---------------------------------------------------------------------
create or replace function public.screen_bundle(p_secret text, p_since bigint default 0, p_app_version text default null)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare v_hash text := public.secret_hash(p_secret); s screens; o organisations; st org_settings; v_out jsonb;
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
     or s.app_version is distinct from p_app_version then
    update screens set last_seen_at = now(), app_version = coalesce(p_app_version, app_version) where id = s.id;
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

-- ---------------------------------------------------------------------
-- 5. Snapshot (pg_cron, hourly) and the report
-- ---------------------------------------------------------------------
create or replace function public.usage_snapshot()
returns void language plpgsql security definer set search_path = public, auth, storage as $$
declare v_day date := public.usage_today();
begin
  insert into usage_daily as u (day, db_bytes, storage_bytes, storage_objects, orgs_active, orgs_seen,
                                screens_total, screens_seen, pings, full_bundles, bundle_bytes, mau_30d, emails)
  select v_day,
         pg_database_size(current_database()),
         coalesce((select sum((o.metadata->>'size')::bigint) from storage.objects o where o.bucket_id = 'media'), 0),
         (select count(*) from storage.objects o where o.bucket_id = 'media'),
         (select count(*) from organisations where status = 'active'),
         (select count(distinct d.org_id) from usage_screen_daily d
            join organisations g on g.id = d.org_id and g.status = 'active' where d.day = v_day),
         (select count(*) from screens where revoked_at is null),
         (select count(*) from usage_screen_daily where day = v_day),
         (select coalesce(sum(pings), 0) from usage_screen_daily where day = v_day),
         (select coalesce(sum(full_bundles), 0) from usage_screen_daily where day = v_day),
         (select coalesce(sum(bytes_out), 0) from usage_screen_daily where day = v_day),
         (select count(*) from auth.users where last_sign_in_at > now() - interval '30 days'),
         coalesce((select sent from usage_email_daily where day = v_day), 0)
  on conflict (day) do update set
     db_bytes = excluded.db_bytes, storage_bytes = excluded.storage_bytes, storage_objects = excluded.storage_objects,
     orgs_active = excluded.orgs_active, orgs_seen = excluded.orgs_seen, screens_total = excluded.screens_total,
     screens_seen = excluded.screens_seen, pings = excluded.pings, full_bundles = excluded.full_bundles,
     bundle_bytes = excluded.bundle_bytes, mau_30d = excluded.mau_30d, emails = excluded.emails, updated_at = now();
end $$;

-- Everything the Penggunaan tab and the alert job need, in one JSON document.
create or replace function public.usage_report()
returns jsonb language plpgsql stable security definer set search_path = public, auth, storage as $$
declare
  v_set usage_settings; v_today date := public.usage_today(); c record; e record; v_cal jsonb;
  v_start_ts timestamptz; v_days_elapsed numeric; v_days_total int;
begin
  select * into v_set from usage_settings;
  select * into c from public.usage_cycle(v_today);
  v_start_ts := c.cycle_start::timestamp at time zone 'Asia/Kuala_Lumpur';
  v_days_elapsed := greatest(extract(epoch from (now() - v_start_ts)) / 86400.0, 0.04);
  v_days_total := c.cycle_end - c.cycle_start;
  select * into e from public.usage_estimate(c.cycle_start, v_today);

  select jsonb_build_object(
           'measured_on', k.measured_on, 'cycle_start', k.cycle_start,
           'egress_gb', k.egress_gb, 'cached_egress_gb', k.cached_egress_gb,
           'factor_egress', case when k.est_egress_bytes > 0 then round(k.egress_gb * 1e9 / k.est_egress_bytes, 3) end,
           'factor_cached', case when k.est_cached_bytes > 0 and k.cached_egress_gb is not null
                                 then round(k.cached_egress_gb * 1e9 / k.est_cached_bytes, 3) end)
    into v_cal
    from usage_calibration k order by k.measured_on desc, k.id desc limit 1;

  return jsonb_build_object(
    'generated_at', now(),
    'snapshot_at', (select max(updated_at) from usage_daily),
    'settings', to_jsonb(v_set) - 'id',
    'cycle', jsonb_build_object('start', c.cycle_start, 'end', c.cycle_end, 'today', v_today,
                                'days_elapsed', round(v_days_elapsed, 3), 'days_total', v_days_total),
    'live', jsonb_build_object(
      'db_bytes', pg_database_size(current_database()),
      'storage_bytes', coalesce((select sum((o.metadata->>'size')::bigint) from storage.objects o where o.bucket_id = 'media'), 0),
      'storage_objects', (select count(*) from storage.objects o where o.bucket_id = 'media'),
      'mau_30d', (select count(*) from auth.users where last_sign_in_at > now() - interval '30 days'),
      'screens_total', (select count(*) from screens where revoked_at is null),
      'screens_online', (select count(*) from screens where revoked_at is null and last_seen_at > now() - interval '3 minutes'),
      'orgs', (select jsonb_object_agg(st, n) from (
                 select s::text st, (select count(*) from organisations g where g.status = s) n
                   from unnest(enum_range(null::org_status)) s) x),
      'orgs_seen_24h', (select count(distinct s.org_id) from screens s join organisations g on g.id = s.org_id
                         where g.status = 'active' and s.revoked_at is null and s.last_seen_at > now() - interval '24 hours')),
    'cycle_to_date', jsonb_build_object(
      'pings',          (select coalesce(sum(pings), 0) from usage_screen_daily where day >= c.cycle_start),
      'full_bundles',   (select coalesce(sum(full_bundles), 0) from usage_screen_daily where day >= c.cycle_start),
      'screens_seen',   (select count(distinct screen_id) from usage_screen_daily where day >= c.cycle_start),
      'orgs_seen',      (select count(distinct org_id) from usage_screen_daily where day >= c.cycle_start),
      'peak_screens_day', (select coalesce(max(n), 0) from (select count(*) n from usage_screen_daily
                             where day >= c.cycle_start group by day) z),
      'bundle_bytes',   e.bundle_bytes,
      'admin_est_bytes', e.admin_bytes,
      'egress_est_bytes', e.egress_bytes,
      'cached_est_bytes', e.cached_bytes,
      'emails_sent',    (select coalesce(sum(sent), 0) from usage_email_daily where day >= c.cycle_start),
      'emails_peak_day', (select coalesce(max(sent), 0) from usage_email_daily where day >= c.cycle_start),
      'emails_today',   coalesce((select sent from usage_email_daily where day = v_today), 0),
      'emails_synced_at', (select max(synced_at) from usage_email_daily)),
    'calibration', v_cal,
    'history', coalesce((select jsonb_agg(to_jsonb(h) - 'updated_at' order by h.day)
                           from usage_daily h where h.day > v_today - 84), '[]'::jsonb),
    'alerts_sent', coalesce((select jsonb_agg(jsonb_build_object('metric', a.metric, 'level', a.level, 'sent_at', a.sent_at))
                               from usage_alerts a where a.cycle_start = c.cycle_start), '[]'::jsonb)
  );
end $$;

-- ---------------------------------------------------------------------
-- 6. Owner-facing functions (platform admin only)
-- ---------------------------------------------------------------------
create or replace function public.platform_usage()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then raise exception 'not_allowed' using errcode = '42501'; end if;
  return public.usage_report();
end $$;

-- Copy "Egress" and "Cached Egress" for the current cycle from Supabase → Usage.
create or replace function public.usage_calibrate(p_measured_on date, p_egress_gb numeric,
                                                   p_cached_gb numeric default null, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c record; e record;
begin
  if not public.is_platform_admin() then raise exception 'not_allowed' using errcode = '42501'; end if;
  if p_measured_on is null or p_measured_on > public.usage_today() then raise exception 'bad_date' using errcode = 'P0001'; end if;
  if p_egress_gb is null or p_egress_gb < 0 or p_egress_gb > 100000 then raise exception 'bad_value' using errcode = 'P0001'; end if;
  select * into c from public.usage_cycle(p_measured_on);
  select * into e from public.usage_estimate(c.cycle_start, p_measured_on);
  insert into usage_calibration (cycle_start, measured_on, egress_gb, cached_egress_gb,
                                 est_egress_bytes, est_cached_bytes, note, created_by)
  values (c.cycle_start, p_measured_on, p_egress_gb, p_cached_gb, e.egress_bytes, e.cached_bytes, p_note, auth.uid());
  return jsonb_build_object('cycle_start', c.cycle_start, 'est_egress_bytes', e.egress_bytes,
                            'factor_egress', case when e.egress_bytes > 0 then round(p_egress_gb * 1e9 / e.egress_bytes, 3) end);
end $$;

-- Plan and money settings. Null = keep. Limits/prices are edited in SQL (rare).
create or replace function public.usage_update_settings(
  p_cycle_day int default null, p_plan text default null, p_compute text default null,
  p_resend_plan text default null, p_fx numeric default null, p_domain_rm numeric default null,
  p_backup_upgrade_at int default null, p_warn_pct int default null, p_crit_pct int default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then raise exception 'not_allowed' using errcode = '42501'; end if;
  update usage_settings set
    cycle_day = coalesce(p_cycle_day, cycle_day), plan = coalesce(p_plan, plan),
    compute = coalesce(p_compute, compute), resend_plan = coalesce(p_resend_plan, resend_plan),
    fx_rm_per_usd = coalesce(p_fx, fx_rm_per_usd), domain_rm_per_year = coalesce(p_domain_rm, domain_rm_per_year),
    backup_upgrade_at = coalesce(p_backup_upgrade_at, backup_upgrade_at),
    alert_warn_pct = coalesce(p_warn_pct, alert_warn_pct), alert_crit_pct = coalesce(p_crit_pct, alert_crit_pct),
    updated_at = now();
end $$;

-- ---------------------------------------------------------------------
-- 7. Service-role functions for the usage-digest Edge Function
-- ---------------------------------------------------------------------
create or replace function public.usage_set_emails(p_day date, p_sent int)
returns void language sql security definer set search_path = public as $$
  insert into usage_email_daily as u (day, sent) values (p_day, greatest(p_sent, 0))
  on conflict (day) do update set sent = greatest(u.sent, excluded.sent), synced_at = now();
$$;

-- true only the first time this metric/level is flagged in this cycle
create or replace function public.usage_mark_alert(p_metric text, p_level text)
returns boolean language plpgsql security definer set search_path = public as $$
declare c record; n int;
begin
  select * into c from public.usage_cycle(null);
  insert into usage_alerts (cycle_start, metric, level) values (c.cycle_start, p_metric, p_level)
  on conflict do nothing;
  get diagnostics n = row_count;
  return n = 1;
end $$;

-- ---------------------------------------------------------------------
-- 8. Grants
-- ---------------------------------------------------------------------
revoke execute on function public.usage_today(), public.usage_cycle(date),
  public.usage_note_ping(uuid, uuid, boolean, int), public.usage_estimate(date, date),
  public.usage_snapshot(), public.usage_report(), public.platform_usage(),
  public.usage_calibrate(date, numeric, numeric, text),
  public.usage_update_settings(int, text, text, text, numeric, numeric, int, int, int),
  public.usage_set_emails(date, int), public.usage_mark_alert(text, text)
  from public, anon, authenticated;
grant execute on function public.screen_bundle(text, bigint, text) to anon, authenticated;
grant execute on function public.platform_usage() to authenticated;
grant execute on function public.usage_calibrate(date, numeric, numeric, text) to authenticated;
grant execute on function public.usage_update_settings(int, text, text, text, numeric, numeric, int, int, int) to authenticated;
grant execute on function public.usage_report(), public.usage_set_emails(date, int),
  public.usage_mark_alert(text, text), public.usage_snapshot() to service_role;

commit;

-- ---------------------------------------------------------------------
-- 9. Schedules (run after the migration, in the SQL editor; needs pg_cron)
-- ---------------------------------------------------------------------
-- select cron.schedule('masjidview-usage-snapshot', '5 * * * *', $$ select public.usage_snapshot(); $$);
-- select cron.schedule('masjidview-usage-trim', '45 19 * * *',     -- 03:45 Malaysia time
--   $$ delete from public.usage_screen_daily where day < public.usage_today() - 120; $$);
-- The usage-digest Edge Function schedule is added in prompt U3 (pg_net + Vault).
