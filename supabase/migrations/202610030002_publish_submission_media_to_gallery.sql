-- Publish every valid sender_photo and shared_memory row into the site's
-- "From Your Favorite People ♡" album, while remaining retry-safe.

begin;

drop index if exists public.photos_source_submission_unique;

create unique index if not exists photos_source_submission_image_unique
  on public.photos (source_submission_id, image_url)
  where source_submission_id is not null;

create or replace function public.publish_submission_media_to_gallery(
  p_submission_id uuid,
  p_supabase_url text
)
returns jsonb
language plpgsql
set search_path = pg_catalog, public, storage
as $$
declare
  v_submission public.letter_submissions%rowtype;
  v_media record;
  v_album_id uuid;
  v_album_order integer;
  v_photo_order integer;
  v_base_url text;
  v_bucket text;
  v_image_url text;
  v_created integer := 0;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('submission-gallery:' || p_submission_id::text, 0)
  );

  select * into v_submission
  from public.letter_submissions
  where id = p_submission_id;

  if not found then
    raise exception 'submission_not_found' using errcode = 'P0001';
  end if;

  v_base_url := rtrim(coalesce(p_supabase_url, ''), '/');
  if v_base_url !~ '^https://[a-z0-9-]+\.supabase\.co$' then
    raise exception 'invalid_supabase_url' using errcode = 'P0001';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('site-order:' || v_submission.gift_site_id::text, 0)
  );

  select a.id into v_album_id
  from public.albums a
  where a.gift_site_id = v_submission.gift_site_id
    and a.title = 'From Your Favorite People ♡'
  order by a.created_at, a.id
  limit 1;

  if v_album_id is null then
    select coalesce(max(a.display_order), 0) + 1 into v_album_order
    from public.albums a
    where a.gift_site_id = v_submission.gift_site_id;

    insert into public.albums (
      gift_site_id, title, description, display_order, is_published
    ) values (
      v_submission.gift_site_id,
      'From Your Favorite People ♡',
      'Little memories shared by the people who love you.',
      v_album_order,
      true
    ) returning id into v_album_id;
  else
    update public.albums set is_published = true where id = v_album_id;
  end if;

  for v_media in
    select sm.id, sm.media_type, sm.storage_path
    from public.submission_media sm
    where sm.submission_id = p_submission_id
      and sm.media_type in ('sender_photo', 'shared_memory')
    order by sm.created_at, sm.id
  loop
    v_bucket := case v_media.media_type
      when 'sender_photo' then 'sender-media'
      else 'gallery-media'
    end;

    if not exists (
      select 1 from storage.objects o
      where o.bucket_id = v_bucket and o.name = v_media.storage_path
    ) or not exists (
      select 1 from storage.buckets b
      where b.id = v_bucket and b.public = true
    ) then
      continue;
    end if;

    v_image_url := v_base_url || '/storage/v1/object/public/' || v_bucket || '/' || v_media.storage_path;

    if exists (
      select 1 from public.photos p
      where p.source_submission_id = p_submission_id
        and p.image_url = v_image_url
    ) then
      continue;
    end if;

    select coalesce(max(p.display_order), 0) + 1 into v_photo_order
    from public.photos p
    where p.album_id = v_album_id;

    insert into public.photos (
      album_id, source_submission_id, image_url, caption, display_order, is_published
    ) values (
      v_album_id,
      p_submission_id,
      v_image_url,
      case when v_media.media_type = 'sender_photo'
        then 'A photo from ' || btrim(v_submission.sender_name) || ' ♡'
        else null
      end,
      v_photo_order,
      true
    );

    v_created := v_created + 1;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'submissionId', p_submission_id,
    'albumId', v_album_id,
    'photosCreated', v_created
  );
end;
$$;

comment on function public.publish_submission_media_to_gallery(uuid, text) is
  'Publishes all valid sender and shared-memory submission media as Gallery photos.';

revoke execute on function public.publish_submission_media_to_gallery(uuid, text)
  from public, anon, authenticated;
grant execute on function public.publish_submission_media_to_gallery(uuid, text)
  to service_role;

commit;
