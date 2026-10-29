-- =====================================================================
-- Masjid View — migration: themes round 2 + announcement-only layout
-- Save as supabase/migrations/<next number>_themes_round2.sql
-- Adds enum values only. No data change. screen_bundle is NOT changed.
-- (ALTER TYPE ... ADD VALUE may run inside the migration transaction on Postgres 12+,
--  but the new values cannot be USED in the same transaction. This file does not use them.)
-- =====================================================================

alter type public.theme_key  add value if not exists 'falak';
alter type public.theme_key  add value if not exists 'garis';
alter type public.theme_key  add value if not exists 'kerawang';
alter type public.theme_key  add value if not exists 'seterusnya';
alter type public.layout_key add value if not exists 'poster';

-- Verify afterwards (run separately):
--   select enum_range(null::public.theme_key);   -- alam, serambi, tenang, falak, garis, kerawang, seterusnya
--   select enum_range(null::public.layout_key);  -- full, bottom, side, poster
--
-- Rollback note: Postgres cannot drop an enum value. If you must roll back, first set any
-- screens using the new values back to tenang/full:
--   update public.screens set theme = 'tenang' where theme in ('falak','garis','kerawang','seterusnya');
--   update public.screens set layout = 'full' where layout = 'poster';
-- The unused enum values can safely stay.
