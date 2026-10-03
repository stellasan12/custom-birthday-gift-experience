# Birthday Gift Experience — Final Technical Report

Audit date: 2026-10-03  
Source of truth: current repository at audit time

## 1. Project overview

Birthday Gift Experience is a personalized, single-page birthday website that presents messages, photos, music, animations, and interactive keepsakes as a guided digital gift. Its primary receiver is the birthday celebrant; gift contributors submit letters and images through Google Forms, while the creator manages core presentation content in Supabase.

The experience includes a first-visit intro, animated greeting, scrapbook-style gift room, sender carousel, shared Letter Reader, Letter Archive, albums, Instagram-inspired social presentation, stories/highlights, local reactions and comments, audio controls, themes, and responsive layouts. Major feature development is complete. The frontend builds successfully, but final deployment still depends on applying and verifying the latest remote Supabase migrations and redeploying the Edge Function.

## 2. Final tech stack

- **Vite 8.3**: development server and production bundler.
- **Vanilla HTML, CSS, and ES modules**: no UI framework; `index.html` loads `src/main.js`.
- **JavaScript dependencies**: `@supabase/supabase-js` 2.117.x. No other runtime package is declared.
- **Supabase/PostgreSQL**: creator content, published letters, albums/photos, contributor submissions, publishing functions, and idempotency indexes.
- **Supabase Storage**: public sender and gallery media buckets referenced as `sender-media` and `gallery-media`.
- **Supabase Edge Functions**: Deno function `ingest-letter-submission` validates and publishes contributor submissions using the service role server-side.
- **Google Forms and Sheets**: contributor input and operational sync status.
- **Google Apps Script and Drive**: reads uploaded Drive images, validates them, and calls the Edge Function.
- **localStorage**: receiver-only progress, reactions, comments, favorites, appearance/audio preferences, and intro/view state.

## 3. Final architecture

```text
Creator-managed content
        │
        └──────────────► Supabase PostgreSQL + Storage
                                      │
Contributor                          │ public, published content
Google Form                          ▼
    │                        Birthday Website (Vite SPA)
    ▼                                  │
Google Sheet                           └──► localStorage
    │                                       receiver interactions
    ▼
Apps Script ── shared-secret POST ──► Supabase Edge Function
                                          │ service role
                                          ▼
                               submissions + media staging
                                          │
                                          ▼
                              automatic publishing functions
                                          │
                                          └──► letters / blocks / photos
```

The browser uses only the public Supabase URL and anon key. Privileged writes occur in the Edge Function. The frontend loads remote content once during boot, normalizes it into the same shape as `siteData`, and then renders without page reloads.

## 4. Major features

- **Intro**: slideshow or configured video. It plays once per local browser state, supports skip and replay from the greeting, and follows browser autoplay restrictions. Video/reel playback pauses background music.
- **Homepage**: animated character, greeting, confetti, “Explore your gift!” CTA, intro replay, and synchronized music control.
- **Explore/Gift Room**: fixed navigation, decorative room scene, responsive layout, locked Gallery/Letters destinations until all gifts are viewed, and a retractable gift reveal.
- **Gift carousel**: dynamically renders configured gifts, records viewed IDs, and unlocks destinations based on configured gift IDs rather than a fixed count.
- **Interactive stickers**: petals, video, music, and decorative responses. A sticker requires three clicks only for its first activation; awakened IDs persist locally.
- **Letter Reader**: one reusable implementation is called by both the carousel and archive. It uses an animated removable/returnable envelope and paginates content at 100 words per page.
- **Sender photos**: upper-centered thumbnail crop, full-image viewer, and default sender fallback.
- **Letter music**: configured `music_url` is normalized into the letter model. Opening a musical letter pauses global BGM, starts the letter track, and shares global volume/mute state.
- **Text reactions**: receiver selections are anchored to stable block IDs and offsets; reactions can be created, edited, and deleted.
- **Letter Archive**: derives entries directly from `siteData.gifts`, generates safe plain-text previews, and opens the shared Letter Reader.
- **Gallery**: album cards, automated “Little moments” carousel, all-memories grid, full photo viewer, image fallbacks, and per-photo favorites.
- **Social view**: profile, sender/follower list, message-to-Letters navigation, Posts grid, Reels intro video, Memories feed, inline comments, and Instagram-like photo modal.
- **Stories/highlights**: album-based story viewer with progress and previous/next navigation.
- **Comments/favorites**: local comments/notes and favorites share stable photo IDs across Gallery and Social presentations. Heart actions include visual and sound feedback.
- **Settings**: Birthday Cake, Lavender Dream, Peach Sunset, and Mint Picnic palettes; four font sizes; master volume; global mute; and preference-only reset.
- **Audio Manager**: central BGM, letter music, sticker music, volume/mute persistence, pause/resume coordination, global floating control, and double-click mute shortcut. UI sound effects intentionally remain audible independently of music mute.
- **Responsive design**: phone, tablet, desktop, short-landscape, and reduced-motion rules are present. Gallery/social media use square or 4:5 crops; modals use viewport-relative bounds.

Missing remote content falls back to local `content.js`. Broken sender, character, and gallery images use dedicated SVG placeholders; missing sticker images are hidden; missing video/audio fails without blocking the rest of the experience.

## 5. Supabase architecture

The frontend and migrations establish these current responsibilities:

| Object | Purpose and relationship |
| --- | --- |
| `gift_sites` | Root site/celebrant record, addressed by unique slug `happy-birthday-name`. |
| `site_settings` | One site's intro type/video, homepage character, and global music URLs. References `gift_sites` through `gift_site_id`. |
| `intro_slides` | Ordered slideshow images for a site. |
| `interactive_stickers` | Ordered sticker name, type, image/media URL, and room position for a site. |
| `letters` | Published sender/letter metadata for a site; optional `source_submission_id` links contributor content to its raw submission. |
| `letter_blocks` | Stable, ordered paragraphs belonging to a letter; block keys support persistent local annotations. |
| `albums` | Ordered published Gallery collections belonging to a site. |
| `photos` | Ordered published images belonging to an album; optional `source_submission_id` provides provenance. The latest migration permits multiple distinct image URLs per submission. |
| `letter_submissions` | Raw Google Form response metadata/content, including site FK, external ID, sender, letter, source, status, and timestamps. |
| `submission_media` | Staged media metadata belonging to a submission. Each row is one `sender_photo` or `shared_memory`; multiple rows of either type are supported. |

Storage buckets referenced by current code are:

- `sender-media`: sender images.
- `gallery-media`: shared memories.

Both publishing functions require the relevant bucket to exist and be public before constructing a public URL. Bucket creation SQL is not present in this repository.

The earlier 6F manual workflow is removed by `202610020001_simplify_to_automatic_publishing.sql`: it drops `creator_submission_queue`, `submission_curation`, and the private prepare/manual-publish functions. The current flow is automatic.

Important repository limitation: the included migrations are forward/incremental migrations. They do not create the original core tables, foreign keys, all RLS policies, or buckets from an empty database.

## 6. Google Form → website pipeline

Current field mapping:

| Form question | Result |
| --- | --- |
| `Name` | `letter_submissions.sender_name`, then published letter sender |
| `Epic picture mo` | Drive image → `sender-media` → `submission_media.sender_photo` → letter sender photo and Gallery photo |
| `Letter` | `letter_submissions.letter_content` → published `letters` plus stable `letter_blocks` |
| `Picture niyo together` | Drive image → `gallery-media` → `submission_media.shared_memory` → Gallery photo |

Apps Script uses an installable spreadsheet submission trigger. It adds stable external-ID, status, Supabase ID, last-attempt, and error columns; extracts Drive IDs from text or rich links; validates images; base64-encodes them; and sends a secret-authenticated JSON request.

The Edge Function validates the secret before parsing/mutation, resolves the site slug, creates or reuses the submission, uploads deterministic content-hashed objects, upserts media metadata, calls `auto_publish_submission`, then calls `publish_submission_media_to_gallery`.

Automatic defaults in current SQL/frontend are:

- Letter title: `For you 💌`.
- Character image: database `null`, rendered with the birthday-character placeholder.
- Letter BGM: `null` unless later configured.
- Sender image: first valid sender media; otherwise the frontend sender placeholder.
- Paragraph blocks: `p1`, `p2`, etc., split on blank lines.
- Gallery album: `From Your Favorite People ♡`, created if absent.
- Gallery media: valid sender and shared-memory rows are published independently.
- Ordering: next maximum site/album `display_order`, protected by PostgreSQL advisory locks in publishing functions.

The documentation still contains a few older statements describing one upload/one shared photo; the implementation now accepts arrays and publishes multiple sender/shared images after the two latest migrations.

## 7. Data and state management

**Supabase provides:** site identity/settings, intro media, stickers, published letters and blocks, albums/photos, raw submissions, staged media metadata, and publication provenance.

**localStorage key `birthdayGiftExperience` provides:**

- whether the intro has been seen;
- whether gifts are revealed;
- awakened sticker IDs;
- viewed gift IDs and all-gifts-unlocked state;
- letter annotations/reactions;
- Gallery/Social view preference;
- photo comments/notes;
- photo and profile favorites;
- album/photo ordering for static fallback content;
- theme, font size, master volume, and mute.

State loading sanitizes settings, lists, comments, and annotations and safely merges missing fields. Reset Settings changes only appearance/audio preferences. The developer reset removes the entire localStorage key.

Supabase UUIDs become gift and photo IDs, while `letter_blocks.block_key` supplies stable annotation anchors. Consequently, the same letter annotations appear whether opened from the carousel or archive, and photo comments/favorites remain consistent between Gallery and Social views—provided database IDs/block keys are not replaced.

## 8. Security and reliability audit

### Confirmed safeguards

- `.env` and `.env.*` are ignored; only examples are tracked. The audit did not print secret values.
- The browser client accepts only `VITE_SUPABASE_URL` and the public anon key and disables auth-session persistence.
- Service-role access is confined to the Edge Function environment.
- The webhook has `verify_jwt = false` intentionally, but requires `x-ingest-secret`; comparison uses SHA-256 digests and a constant-work byte loop.
- Apps Script obtains endpoint, integration secret, and site slug from Script Properties rather than source.
- The Edge Function validates method, required text, lengths, timestamp, base64 syntax, declared MIME type, file signatures, 5 MB per-file size, and 8 MB total decoded size.
- Accepted media: JPEG, PNG, WebP, and GIF. SVG, HEIC, PDF, and video are rejected.
- Deterministic hash-based storage paths plus media upsert and external submission IDs provide retry safety.
- Advisory locks and unique indexes protect publication/order decisions and duplicates.
- Publishing RPC execution is revoked from public/anon/authenticated and granted to `service_role`.
- Apps Script logs sanitized operational metadata, not secrets, base64, or letter content.

### Concerns requiring live verification

- The repository does not include the original RLS policies for core tables. The frontend requires anonymous read access to published rows, while raw submissions must not be anonymously readable. Verify this in the live project.
- The repository does not include creation/configuration SQL for `sender-media` and `gallery-media`; current publishing requires both to be public. Public sender/gallery URLs are intentionally accessible to anyone who knows them.
- The latest migrations and function update were not confirmed deployed during this audit; the CLI previously reported that the local project was not linked.
- `--no-verify-jwt` makes the integration secret the webhook's primary authentication boundary. It must be strong, rotated if exposed, and present only in Supabase secrets and Apps Script properties.
- There is no rate limiter or replay-expiration window in the Edge Function. Stable external IDs prevent duplicate publications, but a leaked integration secret could still permit unwanted new submissions and storage usage.
- Automatic publishing is a trust model: valid Form submissions become public content without moderation.

## 9. Current project structure

```text
custom-birthday-gift-experience/
├── index.html
├── package.json
├── public/
│   ├── audio/                 # BGM, sticker music, click effect
│   ├── images/                # placeholders, gallery art, stickers
│   └── videos/                # sticker video
├── src/
│   ├── main.js                # bootstrap, styles, remote-content load
│   ├── data/content.js        # local fallback content
│   ├── js/
│   │   ├── app.js             # intro, homepage, in-app navigation
│   │   ├── explore.js         # room, stickers, carousel, unlocking
│   │   ├── letter-reader.js   # shared reader, pages, reactions, music
│   │   ├── letter-archive.js  # archive derived from gifts
│   │   ├── gallery.js         # albums, social, reels, stories, viewers
│   │   ├── site-content.js    # site-level Supabase orchestration
│   │   ├── gift-content.js    # letters/blocks query and normalization
│   │   ├── gallery-content.js # albums/photos query and normalization
│   │   ├── audio.js           # centralized music state
│   │   ├── music-toggle.js    # shared floating control
│   │   ├── storage.js         # local state and migrations/sanitization
│   │   ├── settings.js        # settings UI and CSS-driven application
│   │   ├── modal.js           # accessible modal infrastructure
│   │   └── effects.js / sound-effects.js
│   └── styles/                # base, responsive, gallery, settings CSS
├── integrations/google-form/
│   ├── Code.gs                # Sheet/Drive → Edge Function bridge
│   └── README.md
├── supabase/
│   ├── config.toml
│   ├── functions/ingest-letter-submission/index.ts
│   ├── migrations/            # incremental publishing/media changes
│   └── AUTOMATIC_PUBLISHING.md
└── docs/FINAL_PROJECT_REPORT.md
```

## 10. Testing and build

### Actually performed

- `npm run build`: **passed** with Vite 8.3.1; 71 modules transformed.
- Output at audit time: `dist/index.html` 0.60 kB, CSS 64.38 kB (14.63 kB gzip), JS 303.62 kB (81.72 kB gzip).
- `node --check` across every `src/js/*.js`: **passed**.
- Static review of responsive CSS, media fallbacks, content timeout/fallback handling, storage sanitization, annotation anchoring, cross-view photo state, Apps Script retry flow, Edge validation, and SQL idempotency.
- Repository hygiene check: `.env` is ignored and not tracked; example environment files are tracked.

### Requires manual/live testing

- Visual checks at 360 px, common desktop widths, zoom levels, short landscape, and real mobile browsers.
- Fixed-header behavior and overlap across Gallery, Social, Letters, and Explore.
- Real audio/autoplay behavior in Edge/Chrome/Safari and transitions among BGM, letters, stickers, intro replay, and Reels.
- Full annotation regression across carousel/archive using the deployed letter IDs and blocks.
- Gallery comments/favorites across both views after loading deployed photo IDs.
- Actual Supabase RLS visibility and denial behavior for anon/authenticated clients.
- Migration application against a linked project, including the two 20261003 media migrations.
- End-to-end real Google Form submission, Drive access, duplicate retry, invalid-secret rejection, multiple media publication, and public-content visibility.
- Edge Function type checking was not performed locally because Deno is not installed in the audit environment.

## 11. Known limitations

- Receiver interactions are device/browser-local; there is no account or cloud synchronization for reactions, comments, favorites, progress, or settings.
- There is no creator dashboard or moderation queue; creator changes are made directly in Supabase.
- Contributor ingestion depends on Google Forms, Sheets, Drive permissions, Apps Script triggers, and the shared webhook secret.
- Automatic publishing assumes trusted contributors because there is no approval step.
- Audible autoplay remains subject to browser policy; the application falls back to muted playback/first interaction.
- Form media is limited to 5 MB per file and 8 MB combined decoded data per request.
- Storage URLs are public by current design.
- Core schema/RLS/bucket bootstrap SQL is absent from the repository, so a fresh Supabase project cannot be recreated from these migrations alone.
- No automated unit, browser, accessibility, or end-to-end test suite is configured.

## 12. Deployment readiness

### Critical

- Link the correct Supabase project, review `db push --dry-run`, and apply all pending migrations, especially `202610030001` and `202610030002`.
- Redeploy `ingest-letter-submission` after migrations.
- Verify live RLS: anon can read only intended published site content; anon cannot read/write raw submissions or staged metadata; service-only RPCs remain inaccessible publicly.
- Verify both storage buckets, public settings, upload paths, and real media URLs.
- Execute one complete Google Form submission and duplicate retry in production-like conditions.

### Recommended

- Export/check in a canonical baseline migration or schema snapshot covering core tables, FKs, RLS, policies, and bucket setup.
- Update integration documentation to reflect multiple sender/shared images and sender-photo Gallery publishing.
- Run a manual 360 px/desktop accessibility and audio regression pass.
- Rotate the ingestion secret immediately if it has ever appeared in logs, chat, or source.

### Optional

- Add Playwright smoke tests and small unit tests for storage sanitization/annotation pagination.
- Add webhook rate limiting or a timestamp/replay window.
- Add monitoring for failed Edge invocations and Apps Script `Failed` rows.

## 13. Portfolio summary

### Portfolio description

Birthday Gift Experience is a personalized multimedia web application that turns birthday messages, music, photos, and memories into an interactive digital keepsake. The receiver moves through an animated greeting, scrapbook-inspired gift room, reusable letter experience, and Instagram-inspired memory gallery while preserving personal reactions and preferences locally.

The project combines a lightweight Vite/vanilla JavaScript frontend with a Supabase publishing architecture and a secure Google Forms ingestion pipeline. Contributor uploads travel from Google Drive through Apps Script and a validated Edge Function into PostgreSQL and Storage, then become published letters and Gallery memories without exposing privileged credentials to the browser.

### Key portfolio features

- Framework-free SPA architecture with modular ES JavaScript and responsive CSS.
- Supabase-backed, normalized creator and contributor content with local fallbacks.
- Secret-authenticated Google Form/Sheets/Drive ingestion pipeline.
- Idempotent, retry-safe uploads and transactional automatic publishing.
- Shared Letter Reader with stable text annotations across launch surfaces.
- Coordinated multi-source audio state with persistent volume/mute preferences.
- Instagram-inspired albums, posts, reels, stories, comments, and favorites.
- Defensive media validation, image fallbacks, settings sanitization, and accessible modals.

### Technical talking points

- **One reader, multiple entry points:** archive and carousel pass stable gift IDs into the same Letter Reader, preventing duplicated rendering, audio, and annotation logic.
- **Stable local annotations:** database letter/block IDs plus character offsets preserve highlights while letters are paginated for reading.
- **Hybrid state design:** authoritative sentimental content is remote; private receiver interactions stay local and work across visual presentations through stable IDs.
- **Audio coordination:** BGM, sticker tracks, letter tracks, intro/reel video, and always-audible UI effects have deliberately separate but synchronized responsibilities.
- **Safe ingestion:** Drive content is checked twice—Apps Script and Edge Function—then stored at deterministic hash paths and published through service-only RPCs.
- **Graceful degradation:** time-bounded Supabase reads normalize into the same local model, allowing the experience to run with placeholders when remote content is unavailable.

## 14. Final assessment

The project is feature-complete at the frontend level and its production build is healthy. No critical JavaScript build issue was found. It is **conditionally deployment-ready**, not yet fully verified for release, because the latest database migrations/Edge Function deployment and live RLS/storage state were not confirmed.

**Single recommended next step:** link the intended Supabase project, dry-run/apply all pending migrations, redeploy the ingestion function, and complete one end-to-end Form submission verification before deploying the website.
