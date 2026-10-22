-- =====================================================================
-- Masjid View — migration: account rules v0.3
--   • up to 2 equal admins (Pentadbir) per masjid
--   • one masjid per account (email)
-- For a database created from 11-schema.sql v0.1 (editors, unlimited members)
-- or v0.2 (one account per masjid). A database created from v0.3 needs nothing.
-- Check: select column_name from information_schema.columns
--        where table_name = 'invitations' and column_name = 'role';   -> a row = v0.1
--        select to_regprocedure('public.invite_member(uuid,text)');      -> not null = already v0.3
-- Save as supabase/migrations/0003_account_rules.sql (or the next free number).
-- Note: any open invitations are cancelled; admins re-invite from the Ahli page.
-- =====================================================================

begin;
set constraints all immediate;   -- run the keep-pentadbir check now so the ALTERs below are allowed

-- 1. Stop if an account belongs to more than one masjid (must be fixed by hand first).
do $$
declare v_list text;
begin
  select string_agg(u.email || ' (' || n || ' masjid)', ', ') into v_list
    from (select user_id, count(*) n from public.members group by 1 having count(*) > 1) d
    join auth.users u on u.id = d.user_id;
  if v_list is not null then
    raise exception 'These accounts belong to more than one masjid, remove the extra memberships first: %', v_list;
  end if;
end $$;

-- 2. Keep at most 2 accounts per masjid (original pentadbir first, then earliest), all equal admins.
delete from public.members m
 using (select org_id, user_id,
               row_number() over (partition by org_id order by (role::text = 'pentadbir') desc, created_at) rn
          from public.members) r
 where m.org_id = r.org_id and m.user_id = r.user_id and r.rn > 2;
update public.members set role = 'pentadbir' where role::text <> 'pentadbir';
alter table public.members drop constraint if exists members_role_pentadbir;
alter table public.members add constraint members_role_pentadbir check (role::text = 'pentadbir');

-- 3. Indexes and the max-2 trigger.
drop index if exists public.members_one_per_org;
drop index if exists public.members_user_idx;
create index if not exists members_org_idx on public.members (org_id);
create unique index if not exists members_one_per_user on public.members (user_id);

create or replace function public.members_max_two()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform 1 from organisations where id = new.org_id for update;
  if (select count(*) from members where org_id = new.org_id and user_id <> new.user_id) >= 2 then
    raise exception 'org_full' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists members_max_two on public.members;
create trigger members_max_two before insert or update of org_id on public.members
  for each row execute function public.members_max_two();

-- 4. Invitations (fresh table: one open invitation per masjid, no roles).
drop table if exists public.invitations cascade;
create table public.invitations (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organisations on delete cascade,
  email       text not null check (email = lower(email) and position('@' in email) > 1),
  invited_by  uuid references auth.users on delete set null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '14 days',
  accepted_at timestamptz
);
create unique index invitations_one_open on public.invitations (org_id) where accepted_at is null;
alter table public.invitations enable row level security;

-- 5. Policies.
drop policy if exists members_update on public.members;
drop policy if exists members_delete on public.members;
create policy members_delete on public.members for delete to authenticated
  using (public.is_pentadbir(org_id));
create policy inv_select on public.invitations for select to authenticated
  using (public.is_pentadbir(org_id) or public.is_platform_admin());
create policy inv_delete on public.invitations for delete to authenticated
  using (public.is_pentadbir(org_id));

-- 6. Functions.
create or replace function public.register_org(
  p_kind text, p_full_name text, p_short_name text, p_state text, p_district text,
  p_zone text, p_address text default null, p_phone text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_old uuid; v_old_status public.org_status;
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  -- one masjid per account; a rejected registration may be replaced by a new one
  select m.org_id, o.status into v_old, v_old_status
    from members m join organisations o on o.id = m.org_id
   where m.user_id = auth.uid();
  if v_old is not null then
    if v_old_status = 'rejected' then
      delete from organisations where id = v_old;
    else
      raise exception 'already_has_org' using errcode = 'P0001';
    end if;
  end if;
  insert into organisations (kind, full_name, short_name, state, district, zone, address, contact_phone, created_by)
  values (p_kind, trim(p_full_name), trim(p_short_name), p_state, p_district, upper(p_zone), p_address, p_phone, auth.uid())
  returning id into v_id;
  insert into members (org_id, user_id, role) values (v_id, auth.uid(), 'pentadbir');
  insert into org_settings (org_id) values (v_id);
  return v_id;
end $$;

drop function if exists public.accept_invitations();
drop function if exists public.transfer_org(uuid, text);
-- Invite the second admin. Only an admin of an active masjid with 1 member and no open invitation.
create or replace function public.invite_member(p_org uuid, p_email text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_email text := lower(trim(p_email)); v_id uuid;
begin
  if not public.is_pentadbir(p_org) then raise exception 'not_allowed' using errcode = '42501'; end if;
  if not public.is_active_org(p_org) then raise exception 'org_not_active' using errcode = 'P0001'; end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'bad_email' using errcode = 'P0001'; end if;
  if (select count(*) from members where org_id = p_org) >= 2 then raise exception 'org_full' using errcode = 'P0001'; end if;
  if exists (select 1 from members m join auth.users u on u.id = m.user_id where lower(u.email) = v_email) then
    raise exception 'user_has_org' using errcode = 'P0001';
  end if;
  delete from invitations where org_id = p_org and accepted_at is null and expires_at < now();
  if exists (select 1 from invitations where org_id = p_org and accepted_at is null) then
    raise exception 'invite_pending' using errcode = 'P0001';
  end if;
  insert into invitations (org_id, email, invited_by) values (p_org, v_email, auth.uid()) returning id into v_id;
  return v_id;
end $$;

-- Called after every sign-in. Joins the masjid if this email has a valid invitation
-- and the account has no masjid yet. Returns the org id joined, or null.
create or replace function public.accept_invitations()
returns uuid language plpgsql security definer set search_path = public as $$
declare v_email text := lower(auth.jwt() ->> 'email'); r record;
begin
  if auth.uid() is null or v_email is null then return null; end if;
  if exists (select 1 from members where user_id = auth.uid()) then return null; end if;
  select * into r from invitations
   where email = v_email and accepted_at is null and expires_at > now()
   order by created_at limit 1;
  if r.id is null then return null; end if;
  if not public.is_active_org(r.org_id) or (select count(*) from members where org_id = r.org_id) >= 2 then
    return null;
  end if;
  insert into members (org_id, user_id, role) values (r.org_id, auth.uid(), 'pentadbir');
  update invitations set accepted_at = now() where id = r.id;
  return r.org_id;
end $$;

-- Names and emails of the (max 2) admins of a masjid, for the Ahli page.
create or replace function public.org_members(p_org uuid)
returns table (user_id uuid, email text, display_name text, created_at timestamptz, is_me boolean)
language sql stable security definer set search_path = public as $$
  select m.user_id, u.email::text, p.display_name, m.created_at, m.user_id = auth.uid()
    from members m join auth.users u on u.id = m.user_id
    left join profiles p on p.user_id = m.user_id
   where m.org_id = p_org and (public.is_member(p_org) or public.is_platform_admin())
   order by m.created_at;
$$;

-- Platform owner only: give a masjid to another account (lost access, AJK changed).
-- p_replace_email null: add the account (masjid must have fewer than 2 admins).
-- p_replace_email set:  that admin is replaced by the new account.
create or replace function public.transfer_org(p_org uuid, p_email text, p_replace_email text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_user uuid; v_old uuid;
begin
  if not public.is_platform_admin() then raise exception 'not_allowed' using errcode = '42501'; end if;
  if not exists (select 1 from organisations where id = p_org) then raise exception 'org_not_found' using errcode = 'P0001'; end if;
  select id into v_user from auth.users where lower(email) = lower(trim(p_email));
  if v_user is null then raise exception 'user_not_found' using errcode = 'P0001'; end if;
  if exists (select 1 from members where user_id = v_user) then raise exception 'user_has_org' using errcode = 'P0001'; end if;
  if p_replace_email is null then
    insert into members (org_id, user_id, role) values (p_org, v_user, 'pentadbir');  -- org_full if already 2
  else
    select m.user_id into v_old from members m join auth.users u on u.id = m.user_id
     where m.org_id = p_org and lower(u.email) = lower(trim(p_replace_email));
    if v_old is null then raise exception 'member_not_found' using errcode = 'P0001'; end if;
    update members set user_id = v_user where org_id = p_org and user_id = v_old;
  end if;
  delete from invitations where org_id = p_org and accepted_at is null;
end $$;

-- 7. Grants.
revoke execute on function public.register_org(text,text,text,text,text,text,text,text) from public, anon;
revoke execute on function public.invite_member(uuid, text)         from public, anon;
revoke execute on function public.accept_invitations()              from public, anon;
revoke execute on function public.org_members(uuid)                 from public, anon;
revoke execute on function public.transfer_org(uuid, text, text)    from public, anon;
revoke execute on function public.members_max_two()                 from public, anon, authenticated;
grant  execute on function public.register_org(text,text,text,text,text,text,text,text) to authenticated;
grant  execute on function public.invite_member(uuid, text)         to authenticated;
grant  execute on function public.accept_invitations()              to authenticated;
grant  execute on function public.org_members(uuid)                 to authenticated;
grant  execute on function public.transfer_org(uuid, text, text)    to authenticated;

commit;

-- pg_cron: if 11-schema.sql §10 is scheduled, re-create it from v0.3 (it cleans old invitations):
--   select cron.unschedule('masjidview-cleanup');  then run §10 again.
