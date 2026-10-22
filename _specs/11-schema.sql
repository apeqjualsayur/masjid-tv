-- =====================================================================
-- Masjid View — Phase 2 database schema (Supabase / Postgres 15+)
-- v0.3 — full current schema. A fresh project gets the same result from running this file once,
-- or from supabase/migrations/0001_init.sql (= v0.1) followed by the numbered migrations after it.
-- Changes since v0.1: 0002 pair_claim returns NULL on a wrong code (records the failed attempt);
-- 0003 platform_org_list() for the Platform page (registrant e-mail, screens, storage; owners only).
-- =====================================================================

create extension if not exists pgcrypto;
-- pg_cron is enabled from the dashboard (Database → Extensions) before §9.

-- ---------------------------------------------------------------------
-- 1. Types
-- ---------------------------------------------------------------------
create type public.org_status   as enum ('pending', 'active', 'rejected', 'suspended');
create type public.member_role  as enum ('pentadbir', 'editor');
create type public.slide_type   as enum ('poster', 'template');
create type public.slide_status as enum ('draft', 'published', 'paused');
create type public.theme_key    as enum ('alam', 'serambi', 'tenang');
create type public.layout_key   as enum ('full', 'bottom', 'side');

-- ---------------------------------------------------------------------
-- 2. Tables
-- ---------------------------------------------------------------------
create table public.platform_admins (
  user_id    uuid primary key references auth.users on delete cascade,
  created_at timestamptz not null default now()
);

create table public.profiles (
  user_id      uuid primary key references auth.users on delete cascade,
  display_name text check (char_length(display_name) <= 80),
  lang         text not null default 'ms' check (lang in ('ms', 'en')),
  created_at   timestamptz not null default now()
);

create table public.organisations (
  id             uuid primary key default gen_random_uuid(),
  kind           text not null check (kind in ('masjid', 'surau')),
  full_name      text not null check (char_length(full_name) between 3 and 120),
  short_name     text not null check (char_length(short_name) between 1 and 40),
  state          text not null,
  district       text not null,
  zone           text not null check (zone ~ '^[A-Z]{3}[0-9]{2}$'),
  address        text check (char_length(address) <= 300),
  contact_phone  text check (char_length(contact_phone) <= 20),
  logo_path      text,
  accent_color   text not null default '#146C4A' check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  status         public.org_status not null default 'pending',
  status_reason  text,
  bundle_version bigint not null default 1,
  created_by     uuid references auth.users on delete set null,
  created_at     timestamptz not null default now(),
  reviewed_at    timestamptz,
  reviewed_by    uuid references auth.users on delete set null
);

create table public.members (
  org_id     uuid not null references public.organisations on delete cascade,
  user_id    uuid not null references auth.users on delete cascade,
  role       public.member_role not null,
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index members_user_idx on public.members (user_id);

create table public.invitations (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organisations on delete cascade,
  email       text not null check (email = lower(email) and position('@' in email) > 1),
  role        public.member_role not null default 'editor',
  invited_by  uuid references auth.users on delete set null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '14 days',
  accepted_at timestamptz
);
create unique index invitations_open_uniq on public.invitations (org_id, email) where accepted_at is null;

create table public.org_settings (
  org_id      uuid primary key references public.organisations on delete cascade,
  iqamah_min  jsonb not null default '{"subuh":10,"zohor":10,"asar":10,"maghrib":7,"isyak":10}',
  durations   jsonb not null default '{"preAzanMin":5,"azanMin":3,"solatMin":12,"khutbahMin":40}',
  clock_24h   boolean not null default false,
  show_arabic boolean not null default true,
  ticker      text[] not null default '{}' check (cardinality(ticker) <= 5),
  updated_at  timestamptz not null default now()
);

create table public.screens (
  id                 uuid primary key default gen_random_uuid(),
  org_id             uuid not null references public.organisations on delete cascade,
  name               text not null check (char_length(name) between 1 and 60),
  theme              public.theme_key not null default 'tenang',
  layout             public.layout_key not null default 'full',
  device_secret_hash text not null unique,
  app_version        text,
  last_seen_at       timestamptz,
  revoked_at         timestamptz,
  created_by         uuid references auth.users on delete set null,
  created_at         timestamptz not null default now()
);
create index screens_org_idx on public.screens (org_id);

create table public.pairing_codes (
  id                 uuid primary key default gen_random_uuid(),
  code               char(6) not null check (code ~ '^[0-9]{6}$'),
  device_secret_hash text not null unique,
  created_at         timestamptz not null default now(),
  expires_at         timestamptz not null default now() + interval '10 minutes',
  claimed_screen_id  uuid references public.screens on delete cascade,
  claimed_at         timestamptz
);
create unique index pairing_codes_open_uniq on public.pairing_codes (code) where claimed_at is null;

create table public.pair_attempts (
  id           bigserial primary key,
  user_id      uuid not null references auth.users on delete cascade,
  succeeded    boolean not null,
  attempted_at timestamptz not null default now()
);
create index pair_attempts_user_idx on public.pair_attempts (user_id, attempted_at);

create table public.media (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organisations on delete cascade,
  path       text not null unique,          -- '{org_id}/{uuid}.webp' inside bucket 'media'
  kind       text not null check (kind in ('logo', 'poster', 'photo', 'qr')),
  width      int  not null check (width > 0),
  height     int  not null check (height > 0),
  bytes      int  not null check (bytes > 0 and bytes <= 2000000),
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  check (split_part(path, '/', 1) = org_id::text)
);
create index media_org_idx on public.media (org_id);

create table public.slides (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organisations on delete cascade,
  type         public.slide_type not null,
  template_key text check (template_key in ('pengumuman','kuliah','kematian','program','infaq',
                                            'mesyuarat','imam_bilal','kewangan','ayat','ucapan')),
  fields       jsonb not null default '{}',
  media_id     uuid references public.media on delete restrict,
  status       public.slide_status not null default 'draft',
  starts_at    timestamptz not null default now(),
  ends_at      timestamptz,
  duration_s   int not null default 15 check (duration_s between 5 and 120),
  days_of_week smallint[] check (days_of_week <@ array[1,2,3,4,5,6,7]::smallint[]), -- 1=Isnin … 7=Ahad; null = every day
  priority     boolean not null default false,
  sort_order   int not null default 0,
  screen_ids   uuid[],                                                             -- null = all screens
  created_by   uuid references auth.users on delete set null,
  updated_by   uuid references auth.users on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check ((type = 'poster' and media_id is not null and template_key is null)
      or (type = 'template' and template_key is not null)),
  check (ends_at is null or ends_at > starts_at),
  check (template_key is distinct from 'kematian'
      or (ends_at is not null and ends_at <= starts_at + interval '7 days'))
);
create index slides_org_idx on public.slides (org_id, status, sort_order);

-- ---------------------------------------------------------------------
-- 3. Helper functions (used by RLS)
-- ---------------------------------------------------------------------
create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from platform_admins where user_id = auth.uid());
$$;

create or replace function public.member_role_of(p_org uuid)
returns public.member_role language sql stable security definer set search_path = public as $$
  select role from members where org_id = p_org and user_id = auth.uid();
$$;

create or replace function public.is_member(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from members where org_id = p_org and user_id = auth.uid());
$$;

create or replace function public.is_pentadbir(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from members where org_id = p_org and user_id = auth.uid() and role = 'pentadbir');
$$;

create or replace function public.is_active_org(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from organisations where id = p_org and status = 'active');
$$;

-- ---------------------------------------------------------------------
-- 4. Triggers: versioning, guards, timestamps
-- ---------------------------------------------------------------------
create or replace function public.bump_org_version(p_org uuid)
returns void language sql security definer set search_path = public as $$
  update organisations set bundle_version = bundle_version + 1 where id = p_org;
$$;

-- organisations: bump own version on display-relevant changes; protect review fields.
-- SECURITY INVOKER on purpose: current_user is 'authenticated' for app requests, but
-- 'postgres' when called from SECURITY DEFINER functions such as review_org.
create or replace function public.organisations_before_update()
returns trigger language plpgsql set search_path = public as $$
begin
  if not public.is_platform_admin() and current_user not in ('postgres', 'service_role', 'supabase_admin') then
    if new.status is distinct from old.status
       or new.status_reason is distinct from old.status_reason
       or new.reviewed_at is distinct from old.reviewed_at
       or new.reviewed_by is distinct from old.reviewed_by
       or new.created_by is distinct from old.created_by then
      raise exception 'not_allowed' using errcode = '42501';
    end if;
  end if;
  if (new.full_name, new.short_name, new.zone, new.logo_path, new.accent_color, new.kind, new.status)
     is distinct from
     (old.full_name, old.short_name, old.zone, old.logo_path, old.accent_color, old.kind, old.status)
     and new.bundle_version = old.bundle_version then
    new.bundle_version := old.bundle_version + 1;
  end if;
  return new;
end $$;
create trigger organisations_before_update before update on public.organisations
  for each row execute function public.organisations_before_update();

create or replace function public.slides_after_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.bump_org_version(coalesce(new.org_id, old.org_id));
  return null;
end $$;
create trigger slides_after_change after insert or update or delete on public.slides
  for each row execute function public.slides_after_change();

create or replace function public.settings_after_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.bump_org_version(new.org_id);
  return null;
end $$;
create trigger settings_after_change after update on public.org_settings
  for each row execute function public.settings_after_change();

create or replace function public.screens_after_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE'
     and (new.name, new.theme, new.layout, new.revoked_at) is not distinct from
         (old.name, old.theme, old.layout, old.revoked_at) then
    return null;   -- last_seen_at / app_version only: no bump
  end if;
  perform public.bump_org_version(coalesce(new.org_id, old.org_id));
  return null;
end $$;
create trigger screens_after_change after insert or update or delete on public.screens
  for each row execute function public.screens_after_change();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
create trigger slides_touch before update on public.slides
  for each row execute function public.touch_updated_at();
create trigger settings_touch before update on public.org_settings
  for each row execute function public.touch_updated_at();

-- slides: org fixed; set updated_by
create or replace function public.slides_before_write()
returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' and new.org_id <> old.org_id then
    raise exception 'org_change_not_allowed' using errcode = '42501';
  end if;
  new.updated_by := auth.uid();
  if tg_op = 'INSERT' then new.created_by := auth.uid(); end if;
  return new;
end $$;
create trigger slides_before_write before insert or update on public.slides
  for each row execute function public.slides_before_write();

-- members: never leave an org without a pentadbir
create or replace function public.members_keep_pentadbir()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_org uuid := coalesce(old.org_id, new.org_id);
begin
  if exists (select 1 from organisations where id = v_org)
     and not exists (select 1 from members where org_id = v_org and role = 'pentadbir') then
    raise exception 'last_pentadbir' using errcode = 'P0001';
  end if;
  return null;
end $$;
create constraint trigger members_keep_pentadbir after update or delete on public.members
  deferrable initially deferred
  for each row execute function public.members_keep_pentadbir();

-- profile row on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (user_id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'))
  on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 5. Row Level Security
-- ---------------------------------------------------------------------
alter table public.platform_admins enable row level security;
alter table public.profiles        enable row level security;
alter table public.organisations   enable row level security;
alter table public.members         enable row level security;
alter table public.invitations     enable row level security;
alter table public.org_settings    enable row level security;
alter table public.screens         enable row level security;
alter table public.pairing_codes   enable row level security;  -- no policies: RPC only
alter table public.pair_attempts   enable row level security;  -- no policies: RPC only
alter table public.media           enable row level security;
alter table public.slides          enable row level security;

-- platform_admins: user can see whether they are one
create policy pa_select on public.platform_admins for select to authenticated
  using (user_id = auth.uid());

-- profiles: own row
create policy profiles_select on public.profiles for select to authenticated using (user_id = auth.uid());
create policy profiles_update on public.profiles for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- organisations (insert only via register_org)
create policy org_select on public.organisations for select to authenticated
  using (public.is_member(id) or public.is_platform_admin());
create policy org_update on public.organisations for update to authenticated
  using ((public.is_pentadbir(id) and status = 'active') or public.is_platform_admin())
  with check ((public.is_pentadbir(id) and status = 'active') or public.is_platform_admin());

-- members
create policy members_select on public.members for select to authenticated
  using (public.is_member(org_id) or public.is_platform_admin());
create policy members_update on public.members for update to authenticated
  using (public.is_pentadbir(org_id)) with check (public.is_pentadbir(org_id));
create policy members_delete on public.members for delete to authenticated
  using (public.is_pentadbir(org_id) or user_id = auth.uid());

-- invitations
create policy inv_select on public.invitations for select to authenticated
  using (public.is_pentadbir(org_id) or public.is_platform_admin());
create policy inv_insert on public.invitations for insert to authenticated
  with check (public.is_pentadbir(org_id) and public.is_active_org(org_id) and invited_by = auth.uid());
create policy inv_delete on public.invitations for delete to authenticated
  using (public.is_pentadbir(org_id));

-- org_settings
create policy settings_select on public.org_settings for select to authenticated
  using (public.is_member(org_id) or public.is_platform_admin());
create policy settings_update on public.org_settings for update to authenticated
  using (public.is_pentadbir(org_id) and public.is_active_org(org_id))
  with check (public.is_pentadbir(org_id) and public.is_active_org(org_id));

-- screens (insert only via pair_claim)
create policy screens_select on public.screens for select to authenticated
  using (public.is_member(org_id) or public.is_platform_admin());
create policy screens_update on public.screens for update to authenticated
  using (public.is_pentadbir(org_id)) with check (public.is_pentadbir(org_id));
create policy screens_delete on public.screens for delete to authenticated
  using (public.is_pentadbir(org_id));

-- media
create policy media_select on public.media for select to authenticated
  using (public.is_member(org_id) or public.is_platform_admin());
create policy media_insert on public.media for insert to authenticated
  with check (public.is_member(org_id) and created_by = auth.uid());   -- pending orgs may upload their logo
create policy media_delete on public.media for delete to authenticated
  using (public.is_pentadbir(org_id) or created_by = auth.uid());

-- slides (editors + pentadbir of active orgs)
create policy slides_select on public.slides for select to authenticated
  using (public.is_member(org_id) or public.is_platform_admin());
create policy slides_insert on public.slides for insert to authenticated
  with check (public.is_member(org_id) and public.is_active_org(org_id));
create policy slides_update on public.slides for update to authenticated
  using (public.is_member(org_id) and public.is_active_org(org_id))
  with check (public.is_member(org_id) and public.is_active_org(org_id));
create policy slides_delete on public.slides for delete to authenticated
  using (public.is_member(org_id));

-- members.role changes, screens, settings: editors blocked by is_pentadbir above.

-- ---------------------------------------------------------------------
-- 6. RPC functions — admin
-- ---------------------------------------------------------------------
create or replace function public.register_org(
  p_kind text, p_full_name text, p_short_name text, p_state text, p_district text,
  p_zone text, p_address text default null, p_phone text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if (select count(*) from organisations where created_by = auth.uid() and status = 'pending') >= 3 then
    raise exception 'too_many_pending' using errcode = 'P0001';
  end if;
  insert into organisations (kind, full_name, short_name, state, district, zone, address, contact_phone, created_by)
  values (p_kind, trim(p_full_name), trim(p_short_name), p_state, p_district, upper(p_zone), p_address, p_phone, auth.uid())
  returning id into v_id;
  insert into members (org_id, user_id, role) values (v_id, auth.uid(), 'pentadbir');
  insert into org_settings (org_id) values (v_id);
  return v_id;
end $$;

-- p_action: 'approve' | 'reject' | 'suspend' | 'reactivate'
create or replace function public.review_org(p_org uuid, p_action text, p_reason text default null)
returns public.org_status language plpgsql security definer set search_path = public as $$
declare v_status public.org_status;
begin
  if not public.is_platform_admin() then raise exception 'not_allowed' using errcode = '42501'; end if;
  if p_action in ('reject', 'suspend') and coalesce(trim(p_reason), '') = '' then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;
  v_status := case p_action
    when 'approve' then 'active' when 'reactivate' then 'active'
    when 'reject' then 'rejected' when 'suspend' then 'suspended'
    else null end;
  if v_status is null then raise exception 'bad_action' using errcode = 'P0001'; end if;
  update organisations
     set status = v_status, status_reason = p_reason, reviewed_at = now(), reviewed_by = auth.uid()
   where id = p_org;
  return v_status;
end $$;

-- logo for any own org (needed while pending, when org_update RLS does not apply)
create or replace function public.set_org_logo(p_org uuid, p_path text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_pentadbir(p_org) then raise exception 'not_allowed' using errcode = '42501'; end if;
  if p_path is not null and split_part(p_path, '/', 1) <> p_org::text then
    raise exception 'bad_path' using errcode = 'P0001';
  end if;
  update organisations set logo_path = p_path where id = p_org;
end $$;

-- Platform page list (0003): registrant e-mail from auth.users, screen + storage totals. Owners only.
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
language plpgsql stable security definer set search_path = public as $
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
end $;

create or replace function public.accept_invitations()
returns int language plpgsql security definer set search_path = public as $$
declare v_email text := lower(auth.jwt() ->> 'email'); v_count int := 0; r record;
begin
  if auth.uid() is null or v_email is null then return 0; end if;
  for r in select * from invitations
           where email = v_email and accepted_at is null and expires_at > now()
  loop
    insert into members (org_id, user_id, role) values (r.org_id, auth.uid(), r.role)
      on conflict (org_id, user_id) do nothing;
    update invitations set accepted_at = now() where id = r.id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end $$;

-- ---------------------------------------------------------------------
-- 7. RPC functions — TV pairing & sync (callable by anon)
-- ---------------------------------------------------------------------
create or replace function public.secret_hash(p_secret text)
returns text language sql immutable set search_path = public, extensions as $$
  select encode(digest(p_secret, 'sha256'), 'hex');
$$;

create or replace function public.pair_start(p_secret text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare v_hash text; v_code text; v_row pairing_codes; i int := 0;
begin
  if p_secret is null or length(p_secret) < 32 then raise exception 'bad_secret' using errcode = 'P0001'; end if;
  v_hash := public.secret_hash(p_secret);

  if exists (select 1 from screens where device_secret_hash = v_hash and revoked_at is null) then
    return jsonb_build_object('status', 'already_paired');
  end if;

  delete from pairing_codes where claimed_at is null and expires_at < now();

  select * into v_row from pairing_codes where device_secret_hash = v_hash and claimed_at is null;
  if found then
    return jsonb_build_object('status', 'waiting', 'code', v_row.code, 'expires_at', v_row.expires_at);
  end if;

  if (select count(*) from pairing_codes where claimed_at is null) > 5000 then
    raise exception 'busy' using errcode = 'P0001';
  end if;

  loop
    i := i + 1;
    v_code := lpad(((('x' || encode(gen_random_bytes(4), 'hex'))::bit(32)::bigint) % 1000000)::text, 6, '0');
    begin
      insert into pairing_codes (code, device_secret_hash) values (v_code, v_hash) returning * into v_row;
      exit;
    exception when unique_violation then
      if i >= 10 then raise exception 'busy' using errcode = 'P0001'; end if;
    end;
  end loop;
  return jsonb_build_object('status', 'waiting', 'code', v_row.code, 'expires_at', v_row.expires_at);
end $$;

create or replace function public.pair_status(p_secret text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare v_hash text := public.secret_hash(p_secret); v_row pairing_codes; v_screen uuid;
begin
  select id into v_screen from screens where device_secret_hash = v_hash and revoked_at is null;
  if found then return jsonb_build_object('status', 'paired', 'screen_id', v_screen); end if;
  select * into v_row from pairing_codes where device_secret_hash = v_hash;
  if not found then return jsonb_build_object('status', 'unknown'); end if;
  if v_row.claimed_at is null and v_row.expires_at < now() then
    return jsonb_build_object('status', 'expired');
  end if;
  return jsonb_build_object('status', 'waiting', 'code', v_row.code, 'expires_at', v_row.expires_at);
end $$;

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

create or replace function public.screen_bundle(p_secret text, p_since bigint default 0, p_app_version text default null)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare v_hash text := public.secret_hash(p_secret); s screens; o organisations; st org_settings;
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
    return jsonb_build_object('status', 'unchanged', 'version', o.bundle_version);
  end if;

  select * into st from org_settings where org_id = o.id;

  return jsonb_build_object(
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
end $$;

-- ---------------------------------------------------------------------
-- 8. Grants
-- ---------------------------------------------------------------------
-- Supabase grants EXECUTE on new functions to anon + authenticated by default: revoke all, then allow only what is needed.
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.pair_start(text)                       to anon, authenticated;
grant execute on function public.pair_status(text)                      to anon, authenticated;
grant execute on function public.screen_bundle(text, bigint, text)      to anon, authenticated;
grant execute on function public.register_org(text,text,text,text,text,text,text,text) to authenticated;
grant execute on function public.review_org(uuid, text, text)           to authenticated;
grant execute on function public.accept_invitations()                   to authenticated;
grant execute on function public.set_org_logo(uuid, text)               to authenticated;
grant execute on function public.platform_org_list()                    to authenticated;
grant execute on function public.pair_claim(text, uuid, text, public.theme_key, public.layout_key) to authenticated;
grant execute on function public.is_platform_admin()                    to authenticated;
grant execute on function public.member_role_of(uuid)                   to authenticated;
grant execute on function public.is_member(uuid)                        to authenticated;
grant execute on function public.is_pentadbir(uuid)                     to authenticated;
grant execute on function public.is_active_org(uuid)                    to authenticated;
-- Note: trigger functions run as the table owner context; they need no grants.

-- ---------------------------------------------------------------------
-- 9. Storage bucket + policies (bucket 'media', public read)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 2000000, array['image/webp', 'image/png', 'image/jpeg'])
on conflict (id) do nothing;

create policy media_obj_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'media'
              and public.is_member(((storage.foldername(name))[1])::uuid));  -- pending orgs may upload their logo
create policy media_obj_delete on storage.objects for delete to authenticated
  using (bucket_id = 'media'
         and public.is_member(((storage.foldername(name))[1])::uuid));
-- Public read is provided by the bucket being public (no select policy needed for public URLs).

-- ---------------------------------------------------------------------
-- 10. Nightly cleanup (requires pg_cron extension)
-- ---------------------------------------------------------------------
-- select cron.schedule('masjidview-cleanup', '30 19 * * *',  -- 03:30 Malaysia time (UTC+8)
-- $$
--   delete from public.slides where template_key = 'kematian' and ends_at < now() - interval '30 days';
--   delete from public.pairing_codes where (claimed_at is null and expires_at < now() - interval '1 day')
--                                       or claimed_at < now() - interval '30 days';
--   delete from public.pair_attempts where attempted_at < now() - interval '1 day';
--   delete from public.invitations where accepted_at is null and expires_at < now() - interval '30 days';
-- $$);
-- Note: deleting a kematian slide does not delete Storage files; kematian has no images by design.

-- ---------------------------------------------------------------------
-- 11. After running: make yourself platform owner
-- ---------------------------------------------------------------------
-- 1) Sign in once at /admin with your Google account.
-- 2) Run: insert into public.platform_admins (user_id)
--         select id from auth.users where email = 'YOUR_EMAIL';
