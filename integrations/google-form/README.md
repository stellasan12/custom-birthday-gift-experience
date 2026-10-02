# Google Form ingestion setup

This integration validates, stores, and automatically publishes Google Form responses through a privileged Supabase Edge Function. No creator approval step is required.

## Exact Form questions

Keep these titles exactly as written and make all four required unless you intentionally want to accept submissions without media:

| Google Form question | Staged destination |
| --- | --- |
| `Name` | `letter_submissions.sender_name` |
| `Epic picture mo` | `sender-media` + `submission_media.sender_photo` |
| `Letter` | `letter_submissions.letter_content` |
| `Picture niyo together` | `gallery-media` + `submission_media.shared_memory` |

Restrict both upload questions to images. Set one file per question for the current workflow and a maximum of **5 MB per file**. The script and Edge Function also enforce 5 MB per file and 8 MB combined decoded media. Base64 adds roughly 33% to the request; these conservative limits keep the request and Edge Function memory use practical. JPEG, PNG, WebP, and GIF are accepted. HEIC, SVG, PDFs, and videos are rejected.

References: [Google Forms file-upload configuration](https://support.google.com/docs/answer/7322334) and [Supabase Edge Function runtime limits](https://supabase.com/docs/guides/functions/limits).

## 1. Deploy Supabase pieces

1. Apply `supabase/migrations/202609300001_submission_media_retry_safety.sql` to add retry-safe media metadata uniqueness. Review existing duplicate rows first if the migration reports a conflict.
2. Generate a strong random secret outside the repository (at least 32 random bytes).
3. Set it only in the Edge Function environment:

   ```bash
   supabase secrets set GOOGLE_FORM_INGEST_SECRET="your-random-secret"
   ```

4. Deploy the function from the repository root:

   ```bash
   supabase functions deploy ingest-letter-submission --no-verify-jwt
   ```

`supabase/config.toml` also records `verify_jwt = false`. This is intentional because Google Apps Script has no Supabase user JWT. The function instead requires `x-ingest-secret` before parsing or mutating data. Supabase automatically supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to deployed functions; never copy the service-role key into Apps Script or Vite.

The endpoint is:

```text
https://YOUR_PROJECT_REF.supabase.co/functions/v1/ingest-letter-submission
```

## 2. Install the Apps Script

1. Open the Google Form's linked response spreadsheet.
2. Choose **Extensions → Apps Script**.
3. Replace the editor contents with `Code.gs` from this directory and save.
4. Open **Project Settings → Script Properties** and add:

   | Property | Value |
   | --- | --- |
   | `EDGE_FUNCTION_URL` | The deployed function URL above |
   | `INGEST_SECRET` | The same random integration secret |
   | `GIFT_SITE_SLUG` | `happy-birthday-name` |

5. In Apps Script, open **Triggers** in the left sidebar, click **Add Trigger**, and choose:
   - Function: `handleFormSubmit`
   - Deployment: `Head`
   - Event source: `From spreadsheet`
   - Event type: `On form submit`
6. Save and authorize access to the response spreadsheet, Drive uploads, and external requests. Installable triggers run as the account that creates the trigger, so that account must be able to read the uploaded Drive files.

Do not create a simple `onFormSubmit` function. The installable spreadsheet trigger is required for authorized Drive and HTTP access.

References: [Google Apps Script installable triggers](https://developers.google.com/apps-script/guides/triggers/installable) and [Supabase per-function authentication configuration](https://supabase.com/docs/guides/functions/function-configuration).

## Sheet status and manual retry

The script appends operational columns—not Form questions:

- `External Submission ID`
- `Sync Status`
- `Supabase Submission ID`
- `Last Sync Attempt`
- `Sync Error`

Statuses are `Pending`, `Synced`, `Already Synced`, or `Failed`. The stable external ID is generated once from the spreadsheet, sheet, response row, and response timestamp, then stored with the row. Sorting moves it with the response, and retries reuse it.

To retry, select any cell in the failed response row, choose `retrySelectedRow` in Apps Script, and click **Run**. You may also call `processRow(5)` from another Apps Script function when you know the exact row number. Never duplicate the Sheet row to retry; process the original row.

## What happens

1. The handler reads `e.namedValues` using the exact four field names.
2. It extracts one or more Drive IDs from `?id=...`, `/d/...`, bare IDs, and rich-text hyperlinks.
3. Drive blobs are checked for type and size, then base64 encoded.
4. The Edge Function validates the shared secret and entire payload before mutation.
5. It resolves `gift_sites.slug = happy-birthday-name`.
6. It creates or retrieves one `letter_submissions` row with `source = google_form` and a temporary `pending` status.
7. Images upload to deterministic, content-hashed paths and corresponding `submission_media` records are upserted.
8. The Edge Function calls the service-only transactional publisher.
9. The letter, persistent blocks, and optional shared-memory photo are published automatically.
10. The submission becomes `published` only after publication succeeds.

Storage paths:

```text
sender-media/{giftSiteId}/submissions/{submissionId}/sender/{contentHash}-{safeFilename}
gallery-media/{giftSiteId}/submissions/{submissionId}/shared-memory/{contentHash}-{safeFilename}
```

If a later upload or metadata insert fails, the request reports failure. Running `processRow` again retrieves the same submission, overwrites the same content-hashed objects, and upserts the same media records. Completed work is not duplicated.

## Verification checklist

Submit the real test values from the Increment 6E specification, then confirm:

- The response Sheet shows `Synced`.
- One `letter_submissions` record exists with `status = published`.
- Two `submission_media` records exist with the correct media types.
- Both Storage objects exist at the expected paths.
- One published letter and stable paragraph-block set exist.
- One published photo exists in `From Your Favorite People ♡` when shared media was supplied.
- Retrying the same row changes the Sheet status to `Already Synced` without duplicates.
- A request with the wrong secret returns HTTP 401 without mutation.
- Missing `Name` or `Letter`, an inaccessible Drive file, unsupported MIME type, or oversized media records `Failed` and remains retryable.

The script logs only row number, HTTP status/result, submission UUID, and sanitized failures. It does not log secrets, base64 media, or letter content.

For defaults, optional customization, retry guarantees, and verification SQL, see [`supabase/AUTOMATIC_PUBLISHING.md`](../../supabase/AUTOMATIC_PUBLISHING.md).
