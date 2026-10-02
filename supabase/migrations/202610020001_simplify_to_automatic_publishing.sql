-- Increment 6F revision: remove the manual curation workflow while preserving
-- published records, raw submissions, staged media, and idempotency indexes.

drop view if exists public.creator_submission_queue;
drop function if exists private.publish_submission(uuid, text);
drop function if exists private.prepare_submission_for_curation(uuid);

drop table if exists public.submission_curation;
drop function if exists private.set_submission_curation_updated_at();

-- Keep/ensure the useful one-submission-to-one-public-record guarantees.
create unique index if not exists letters_source_submission_unique
  on public.letters (source_submission_id)
  where source_submission_id is not null;

create unique index if not exists photos_source_submission_unique
  on public.photos (source_submission_id)
  where source_submission_id is not null;

create or replace function public.auto_publish_submission(
  p_submission_id uuid,
  p_supabase_url text
)
returns jsonb
language plpgsql
set search_path = pg_catalog, public, storage
as $$
declare
  v_submission public.letter_submissions%rowtype;
  v_sender_path text;
  v_memory_path text;
  v_sender_url text;
  v_memory_url text;
  v_base_url text;
  v_letter_id uuid;
  v_photo_id uuid;
  v_album_id uuid;
  v_letter_created boolean := false;
  v_photo_created boolean := false;
  v_letter_order integer;
  v_photo_order integer;
  v_album_order integer;
begin
  -- Serialize retries for this response and ordering decisions for this site.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('submission:' || p_submission_id::text, 0));

  select * into v_submission
  from public.letter_submissions
  where id = p_submission_id
  for update;

  if not found then raise exception 'submission_not_found' using errcode = 'P0001'; end if;
  if v_submission.status = 'rejected' then raise exception 'rejected_submission' using errcode = 'P0001'; end if;
  if nullif(btrim(v_submission.sender_name), '') is null or nullif(btrim(v_submission.letter_content), '') is null then
    raise exception 'invalid_submission_content' using errcode = 'P0001';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('site-order:' || v_submission.gift_site_id::text, 0));

  v_base_url := rtrim(coalesce(p_supabase_url, ''), '/');
  if v_base_url !~ '^https://[a-z0-9-]+\.supabase\.co$' then
    raise exception 'invalid_supabase_url' using errcode = 'P0001';
  end if;

  select sm.storage_path into v_sender_path
  from public.submission_media sm
  where sm.submission_id = p_submission_id and sm.media_type = 'sender_photo'
  order by sm.created_at, sm.id limit 1;

  if v_sender_path is not null then
    if exists (select 1 from storage.objects o where o.bucket_id = 'sender-media' and o.name = v_sender_path)
       and exists (select 1 from storage.buckets b where b.id = 'sender-media' and b.public = true) then
      v_sender_url := v_base_url || '/storage/v1/object/public/sender-media/' || v_sender_path;
    else
      v_sender_path := null;
    end if;
  end if;

  select sm.storage_path into v_memory_path
  from public.submission_media sm
  where sm.submission_id = p_submission_id and sm.media_type = 'shared_memory'
  order by sm.created_at, sm.id limit 1;

  if v_memory_path is not null then
    if exists (select 1 from storage.objects o where o.bucket_id = 'gallery-media' and o.name = v_memory_path)
       and exists (select 1 from storage.buckets b where b.id = 'gallery-media' and b.public = true) then
      v_memory_url := v_base_url || '/storage/v1/object/public/gallery-media/' || v_memory_path;
    else
      v_memory_path := null;
    end if;
  end if;

  -- Preserve any record already published by the previous 6F workflow.
  select l.id into v_letter_id
  from public.letters l
  where l.source_submission_id = p_submission_id;

  if v_letter_id is null then
    select coalesce(max(l.display_order), 0) + 1 into v_letter_order
    from public.letters l
    where l.gift_site_id = v_submission.gift_site_id;

    insert into public.letters (
      gift_site_id, source_submission_id, sender_name, sender_photo_url,
      title, content, character_image_url, music_url, display_order, is_published
    ) values (
      v_submission.gift_site_id, p_submission_id, btrim(v_submission.sender_name), v_sender_url,
      'For you 💌', v_submission.letter_content, null, null, v_letter_order, true
    )
    returning id into v_letter_id;
    v_letter_created := true;
  end if;

  -- Generate blocks once. Existing blocks and their annotation keys are untouched.
  if not exists (select 1 from public.letter_blocks b where b.letter_id = v_letter_id) then
    insert into public.letter_blocks (letter_id, block_key, content, display_order)
    select
      v_letter_id,
      'p' || paragraph_number,
      paragraph,
      paragraph_number
    from (
      select btrim(value) as paragraph, ordinality::integer as paragraph_number
      from regexp_split_to_table(v_submission.letter_content, E'\\r?\\n[\\t ]*\\r?\\n')
        with ordinality as blocks(value, ordinality)
    ) parsed
    where paragraph <> '';
  end if;

  if not exists (select 1 from public.letter_blocks b where b.letter_id = v_letter_id) then
    raise exception 'letter_blocks_not_created' using errcode = 'P0001';
  end if;

  -- A shared memory is optional: never create a fake or broken photo.
  select p.id into v_photo_id
  from public.photos p
  where p.source_submission_id = p_submission_id;

  if v_memory_path is not null and v_photo_id is null then
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

    select coalesce(max(p.display_order), 0) + 1 into v_photo_order
    from public.photos p
    where p.album_id = v_album_id;

    insert into public.photos (
      album_id, source_submission_id, image_url, caption, display_order, is_published
    ) values (
      v_album_id, p_submission_id, v_memory_url, null, v_photo_order, true
    )
    returning id into v_photo_id;
    v_photo_created := true;
  end if;

  update public.letter_submissions
  set status = 'published', updated_at = now()
  where id = p_submission_id;

  return jsonb_build_object(
    'ok', true,
    'status', case when v_letter_created or v_photo_created then 'published' else 'already_published' end,
    'submissionId', p_submission_id,
    'letterId', v_letter_id,
    'photoId', v_photo_id,
    'letterCreated', v_letter_created,
    'photoCreated', v_photo_created,
    'senderPhotoStatus', case when v_sender_path is null then 'missing_using_placeholder' else 'available' end,
    'sharedMemoryStatus', case when v_memory_path is null then 'missing_skipped' else 'available' end
  );
end;
$$;

comment on function public.auto_publish_submission(uuid, text) is
  'Service-only idempotent publisher called by the Google Form ingestion Edge Function.';

revoke execute on function public.auto_publish_submission(uuid, text) from public, anon, authenticated;
grant execute on function public.auto_publish_submission(uuid, text) to service_role;
