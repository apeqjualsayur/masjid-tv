-- =====================================================================
-- 0004 — storage: members can see their own masjid's files (so deletes work)
-- =====================================================================
-- Problem (found 2026-10-22 while building Tetapan): Supabase Storage only deletes objects the
-- user can SELECT. storage.objects had insert/delete policies but no select policy, so
-- remove() answered "ok" and deleted nothing: replaced logos and failed uploads stayed in the
-- bucket forever.
-- Change: members may select objects in their own masjid's folder ({org_id}/…) of bucket 'media'.
-- Nothing new becomes readable to anyone else: the bucket is public by design (PRD §7), and this
-- policy only adds API listing/deleting of your own masjid's files.
-- CASE keeps the uuid cast from running on other buckets' or non-uuid folder names.
create policy media_obj_select on storage.objects for select to authenticated
  using (
    case
      when bucket_id = 'media' and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then public.is_member(((storage.foldername(name))[1])::uuid)
      else false
    end
  );