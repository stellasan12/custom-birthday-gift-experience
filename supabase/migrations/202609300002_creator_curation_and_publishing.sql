create schema if not exists private;

create table if not exists public.submission_curation (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references public.letter_submissions(id) on delete cascade,
  letter_title text not null default 'For you 💌',
  character_image_url text,
  music_url text,
  target_album_id uuid references public.albums(id) on delete set null,
  letter_display_order integer not null default 0,
  photo_display_order integer not null default 0,
  gallery_caption text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint submission_curation_title_not_blank check (btrim(letter_title) <> ''),
  constraint submission_curation_title_length check (char_length(letter_title) <= 300),
  constraint submission_curation_caption_length check (gallery_caption is null or char_length(gallery_caption) <= 2000)
);

comment on table public.submission_curation is
  'Creator-owned publishing inputs. Editing this table does not update already-published records.';
comment on column public.submission_curation.target_album_id is
  'Existing album selected by the creator; publish_submission verifies it belongs to the submission gift site.';

alter table public.submission_curation enable row level security;
revoke all on table public.submission_curation from anon, authenticated;
grant select, insert, update, delete on table public.submission_curation to service_role;

create or replace function private.set_submission_curation_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists submission_curation_set_updated_at on public.submission_curation;
create trigger submission_curation_set_updated_at
before update on public.submission_curation
for each row execute function private.set_submission_curation_updated_at();

-- NULL source IDs remain unrestricted, so manually created content is unaffected.
create unique index if not exists letters_source_submission_unique
  on public.letters (source_submission_id)
  where source_submission_id is not null;

create unique index if not exists photos_source_submission_unique
  on public.photos (source_submission_id)
  where source_submission_id is not null;

create or replace view public.creator_submission_queue
with (security_invoker = true)
as
select
  s.id as submission_id,
  s.gift_site_id,
  gs.slug as site_slug,
  s.sender_name,
  s.letter_content,
  s.status,
  sender_media.storage_path as sender_photo_path,
  shared_media.storage_path as shared_memory_path,
  c.letter_title,
  c.character_image_url,
  c.music_url,
  c.target_album_id,
  a.title as target_album_title,
  c.letter_display_order,
  c.photo_display_order,
  c.gallery_caption,
  published_letter.id as published_letter_id,
  published_photo.id as published_photo_id,
  s.submitted_at,
  s.created_at,
  c.updated_at as curation_updated_at
from public.letter_submissions s
join public.gift_sites gs on gs.id = s.gift_site_id
left join public.submission_curation c on c.submission_id = s.id
left join public.albums a on a.id = c.target_album_id
left join lateral (
  select sm.storage_path
  from public.submission_media sm
  where sm.submission_id = s.id and sm.media_type = 'sender_photo'
  order by sm.created_at, sm.id
  limit 1
) sender_media on true
left join lateral (
  select sm.storage_path
  from public.submission_media sm
  where sm.submission_id = s.id and sm.media_type = 'shared_memory'
  order by sm.created_at, sm.id
  limit 1
) shared_media on true
left join public.letters published_letter on published_letter.source_submission_id = s.id
left join public.photos published_photo on published_photo.source_submission_id = s.id;

comment on view public.creator_submission_queue is
  'Dashboard-only review queue combining staged submission, curation, media paths, and published record IDs.';
revoke all on table public.creator_submission_queue from public, anon, authenticated;
grant select on table public.creator_submission_queue to service_role;

create or replace function private.prepare_submission_for_curation(p_submission_id uuid)
returns public.submission_curation
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_submission public.letter_submissions%rowtype;
  v_curation public.submission_curation%rowtype;
  v_letter_order integer;
  v_photo_order integer;
begin
  select * into v_submission
  from public.letter_submissions
  where id = p_submission_id;

  if not found then raise exception 'submission_not_found' using errcode = 'P0001'; end if;

  select coalesce(max(l.display_order), 0) + 10 into v_letter_order
  from public.letters l where l.gift_site_id = v_submission.gift_site_id;

  select coalesce(max(p.display_order), 0) + 10 into v_photo_order
  from public.photos p
  join public.albums a on a.id = p.album_id
  where a.gift_site_id = v_submission.gift_site_id;

  insert into public.submission_curation (
    submission_id, letter_display_order, photo_display_order
  ) values (
    p_submission_id, v_letter_order, v_photo_order
  )
  on conflict (submission_id) do update set submission_id = excluded.submission_id
  returning * into v_curation;

  return v_curation;
end;
$$;

create or replace function private.publish_submission(
  p_submission_id uuid,
  p_supabase_url text
)
returns jsonb
language plpgsql
set search_path = pg_catalog, public, storage
as $$
declare
  v_submission public.letter_submissions%rowtype;
  v_curation public.submission_curation%rowtype;
  v_sender_path text;
  v_memory_path text;
  v_sender_url text;
  v_memory_url text;
  v_letter_id uuid;
  v_photo_id uuid;
  v_existing_letter_id uuid;
  v_existing_photo_id uuid;
  v_base_url text;
begin
  -- Serialize all publication attempts for the same submission.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_submission_id::text, 0));

  select * into v_submission
  from public.letter_submissions
  where id = p_submission_id
  for update;

  if not found then raise exception 'submission_not_found' using errcode = 'P0001'; end if;
  if v_submission.status = 'rejected' then raise exception 'rejected_submission' using errcode = 'P0001'; end if;
  if v_submission.status not in ('pending', 'approved', 'published') then
    raise exception 'invalid_submission_status' using errcode = 'P0001';
  end if;
  if nullif(btrim(v_submission.sender_name), '') is null or nullif(btrim(v_submission.letter_content), '') is null then
    raise exception 'invalid_submission_content' using errcode = 'P0001';
  end if;

  select id into v_existing_letter_id from public.letters where source_submission_id = p_submission_id;
  select id into v_existing_photo_id from public.photos where source_submission_id = p_submission_id;
  if v_existing_letter_id is not null or v_existing_photo_id is not null then
    if v_existing_letter_id is null or v_existing_photo_id is null then
      raise exception 'inconsistent_existing_publication' using errcode = 'P0001';
    end if;
    update public.letter_submissions set status = 'published', updated_at = now() where id = p_submission_id;
    return jsonb_build_object(
      'ok', true, 'status', 'already_published',
      'submissionId', p_submission_id,
      'letterId', v_existing_letter_id,
      'photoId', v_existing_photo_id
    );
  end if;

  select * into v_curation
  from public.submission_curation
  where submission_id = p_submission_id;
  if not found then raise exception 'curation_not_found' using errcode = 'P0001'; end if;
  if nullif(btrim(v_curation.letter_title), '') is null then raise exception 'letter_title_required' using errcode = 'P0001'; end if;
  if v_curation.target_album_id is null then raise exception 'target_album_required' using errcode = 'P0001'; end if;
  if not exists (
    select 1 from public.albums a
    where a.id = v_curation.target_album_id and a.gift_site_id = v_submission.gift_site_id
  ) then raise exception 'invalid_or_cross_site_album' using errcode = 'P0001'; end if;

  select sm.storage_path into v_sender_path
  from public.submission_media sm
  where sm.submission_id = p_submission_id and sm.media_type = 'sender_photo'
  order by sm.created_at, sm.id limit 1;
  select sm.storage_path into v_memory_path
  from public.submission_media sm
  where sm.submission_id = p_submission_id and sm.media_type = 'shared_memory'
  order by sm.created_at, sm.id limit 1;
  if v_sender_path is null then raise exception 'sender_photo_required' using errcode = 'P0001'; end if;
  if v_memory_path is null then raise exception 'shared_memory_required' using errcode = 'P0001'; end if;
  if not exists (select 1 from storage.objects where bucket_id = 'sender-media' and name = v_sender_path) then
    raise exception 'sender_photo_object_missing' using errcode = 'P0001';
  end if;
  if not exists (select 1 from storage.objects where bucket_id = 'gallery-media' and name = v_memory_path) then
    raise exception 'shared_memory_object_missing' using errcode = 'P0001';
  end if;
  if not exists (select 1 from storage.buckets where id = 'sender-media' and public) or
     not exists (select 1 from storage.buckets where id = 'gallery-media' and public) then
    raise exception 'staged_media_bucket_not_public' using errcode = 'P0001';
  end if;

  v_base_url := rtrim(coalesce(p_supabase_url, ''), '/');
  if v_base_url !~ '^https://[a-z0-9-]+\.supabase\.co$' then
    raise exception 'invalid_supabase_url' using errcode = 'P0001';
  end if;
  v_sender_url := v_base_url || '/storage/v1/object/public/sender-media/' || v_sender_path;
  v_memory_url := v_base_url || '/storage/v1/object/public/gallery-media/' || v_memory_path;

  insert into public.letters (
    gift_site_id, source_submission_id, sender_name, sender_photo_url,
    title, content, character_image_url, music_url, display_order, is_published
  ) values (
    v_submission.gift_site_id, p_submission_id, btrim(v_submission.sender_name), v_sender_url,
    btrim(v_curation.letter_title), v_submission.letter_content,
    nullif(btrim(v_curation.character_image_url), ''), nullif(btrim(v_curation.music_url), ''),
    v_curation.letter_display_order, true
  ) returning id into v_letter_id;

  insert into public.letter_blocks (letter_id, block_key, content, display_order)
  select
    v_letter_id,
    'p' || paragraph_number,
    paragraph,
    paragraph_number
  from (
    select btrim(value) as paragraph, ordinality::integer as paragraph_number
    from regexp_split_to_table(v_submission.letter_content, E'\\r?\\n[\\t ]*\\r?\\n') with ordinality as blocks(value, ordinality)
  ) parsed
  where paragraph <> '';

  if not exists (select 1 from public.letter_blocks where letter_id = v_letter_id) then
    raise exception 'letter_blocks_not_created' using errcode = 'P0001';
  end if;

  insert into public.photos (
    album_id, source_submission_id, image_url, caption, display_order, is_published
  ) values (
    v_curation.target_album_id, p_submission_id, v_memory_url,
    nullif(btrim(v_curation.gallery_caption), ''), v_curation.photo_display_order, true
  ) returning id into v_photo_id;

  update public.letter_submissions
  set status = 'published', updated_at = now()
  where id = p_submission_id;

  return jsonb_build_object(
    'ok', true, 'status', 'published',
    'submissionId', p_submission_id,
    'letterId', v_letter_id,
    'photoId', v_photo_id
  );
end;
$$;

comment on function private.prepare_submission_for_curation(uuid) is
  'Dashboard-only helper that creates one editable curation row with sensible display-order defaults.';
comment on function private.publish_submission(uuid, text) is
  'Dashboard-only transactional publisher. Creates letter, stable blocks, and gallery photo exactly once.';

revoke all on function private.prepare_submission_for_curation(uuid) from public, anon, authenticated, service_role;
revoke all on function private.publish_submission(uuid, text) from public, anon, authenticated, service_role;
revoke usage on schema private from public, anon, authenticated, service_role;

