-- Retry-safe metadata inserts without changing or recreating existing tables.
create unique index if not exists submission_media_submission_type_path_key
  on public.submission_media (submission_id, media_type, storage_path);

