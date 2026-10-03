-- Allow each submission to own multiple sender and shared-memory images.
-- Store one image per row; do not place multiple values in one media_type cell.

begin;

-- Replace older media_type checks without relying on a generated constraint name.
do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select c.conname
    from pg_catalog.pg_constraint c
    join pg_catalog.pg_class t on t.oid = c.conrelid
    join pg_catalog.pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'submission_media'
      and c.contype = 'c'
      and pg_catalog.pg_get_constraintdef(c.oid) ilike '%media_type%'
  loop
    execute format(
      'alter table public.submission_media drop constraint %I',
      constraint_name
    );
  end loop;
end
$$;

-- Keep media_type extensible and independent of any older enum definition.
alter table public.submission_media
  alter column media_type type text using media_type::text;

-- Accept shorthand rows that may already have been entered manually.
update public.submission_media
set media_type = case media_type
  when 'sender' then 'sender_photo'
  when 'shared' then 'shared_memory'
  else media_type
end
where media_type in ('sender', 'shared');

alter table public.submission_media
  add constraint submission_media_type_check
  check (media_type in ('sender_photo', 'shared_memory'));

-- Multiple files of either type are allowed. The same physical file remains
-- retry-safe and cannot be inserted twice for the same submission and type.
create unique index if not exists submission_media_submission_type_path_key
  on public.submission_media (submission_id, media_type, storage_path);

create index if not exists submission_media_submission_type_lookup_idx
  on public.submission_media (submission_id, media_type, created_at, id);

comment on column public.submission_media.media_type is
  'One value per media row: sender_photo or shared_memory. A submission may have multiple rows of either type.';

commit;
