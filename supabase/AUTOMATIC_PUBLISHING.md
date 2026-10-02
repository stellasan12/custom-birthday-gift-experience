# Automatic Google Form publishing

Google Form responses now publish automatically through the authenticated server-side ingestion pipeline:

```text
Google Form → Sheet → Apps Script → Edge Function → Storage + database → website
```

There is no approval, curation table, album selection, or manual publish command.

## Apply and deploy

From the repository root:

```powershell
npx supabase@latest db push --dry-run
npx supabase@latest db push
npx supabase@latest functions deploy ingest-letter-submission --no-verify-jwt
```

The forward migration `202610020001_simplify_to_automatic_publishing.sql` removes the old manual 6F objects without deleting submissions, staged media, letters, blocks, albums, or photos. It retains the useful source-submission uniqueness guarantees.

The Edge Function must be redeployed because it now calls `auto_publish_submission` after media staging.

## Automatic defaults

Each successful response produces a published letter with:

- Title: `For you 💌`
- Character: `null` → existing cute frontend placeholder
- Sender photo: staged sender image, or `null` → existing sender placeholder
- Letter BGM: `null`
- Display order: current site maximum + 1
- Persistent blocks: `p1`, `p2`, ... split on blank lines

If a valid shared memory exists, it produces one published photo with:

- Album: `From Your Favorite People ♡`
- Caption: `null`
- Display order: current album maximum + 1

The default album is created once per gift site when first needed. If shared memory is missing or inaccessible, the letter still publishes and the photo is skipped.

## Optional customization

After publication, the creator may directly edit live records in Supabase:

- `letters.title`
- `letters.character_image_url`
- `letters.music_url`
- `letters.display_order`
- `photos.caption`
- `photos.album_id`
- `photos.display_order`

Refresh the website after editing. No republishing is required.

## Retry and existing content behavior

The raw `letter_submissions` and `submission_media` records remain the audit trail. Every published letter/photo points back through `source_submission_id`.

- Retrying the same Sheet row reuses the same submission.
- Existing letters, blocks, and photos from the previous 6F workflow are preserved and not overwritten.
- Missing publication pieces are completed safely.
- Existing block rows are never regenerated, preserving annotation keys.
- Partial unique indexes prevent multiple contributor letters or photos per submission.
- Site-level transaction locks make append ordering and default-album creation deterministic under concurrent submissions.

## Security and trust model

Automatic publication intentionally trusts content arriving through the configured Google Form pipeline after validation. The endpoint still requires `x-ingest-secret`; uploaded media is size-, MIME-, base64-, and signature-validated; privileged keys remain only in the Edge Function environment.

`auto_publish_submission` is executable only by `service_role`. It is not available to the anonymous website or ordinary authenticated clients.

## Verification

Submit a test Form response with two paragraphs, then verify:

```sql
select id, status, sender_name
from public.letter_submissions
where sender_name = 'Test Friend'
order by created_at desc;

select id, title, character_image_url, music_url, sender_photo_url,
       display_order, source_submission_id, is_published
from public.letters
where source_submission_id = 'SUBMISSION_UUID'::uuid;

select block_key, content, display_order
from public.letter_blocks
where letter_id = 'LETTER_UUID'::uuid
order by display_order;

select a.title, p.id, p.caption, p.display_order,
       p.source_submission_id, p.is_published
from public.photos p
join public.albums a on a.id = p.album_id
where p.source_submission_id = 'SUBMISSION_UUID'::uuid;
```

Expected submission status is `published`. Retrying the same Sheet row must leave one submission, one letter, one block set, and at most one contributor photo.

