-- =====================================================================
-- Masjid View — migration: Friday settings (Solat Jumaat length + Friday info strip)
-- ONLY for a database created before 11-schema.sql had "jumaatSolatMin" in durations.
-- Check first:  select column_default from information_schema.columns
--               where table_name = 'org_settings' and column_name = 'durations';
-- If the result already contains jumaatSolatMin, skip this file.
-- Saved as supabase/migrations/0007_friday.sql.
-- Both values live inside the existing durations jsonb, so screen_bundle needs no change.
-- =====================================================================

begin;

alter table public.org_settings
  alter column durations set default
  '{"preAzanMin":5,"azanMin":3,"solatMin":12,"khutbahMin":40,"jumaatSolatMin":12,"showFridayInfo":true}';

-- existing masjids: add the new keys, keep any values already set
update public.org_settings
   set durations = '{"jumaatSolatMin":12,"showFridayInfo":true}'::jsonb || durations
 where not (durations ? 'jumaatSolatMin' and durations ? 'showFridayInfo');

commit;
