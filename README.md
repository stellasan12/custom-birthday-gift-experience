# 🎂 Birthday Gift Experience

A cute, warm, and whimsical interactive birthday gift website — built as a polished single-page experience with Vite + Vanilla JavaScript.

## ✨ Features (Increments 1–4)

- **Intro slideshow** — cinematic opening with crossfade transitions and Ken Burns effect
- **Optional video intro** — just change one config value
- **Homepage reveal** — staggered entrance animation with confetti burst
- **Celebratory confetti** — lightweight canvas-based, auto-cleanup
- **Global audio infrastructure** — background music with browser autoplay policy compliance
- **Soft pastel design system** — CSS custom properties, Quicksand + Pacifico fonts
- **Fully responsive** — mobile (360px) → tablet (768px) → desktop (1440px+)
- **Accessible** — semantic HTML, keyboard navigation, focus states, reduced-motion support
- **Explore Room** — scrapbook-style room with configurable interactive stickers
- **Gift reveal and carousel** — touch, mouse, button, and keyboard-friendly horizontal browsing
- **Persistent progress** — safe local storage for reveals, viewed gifts, and dynamic unlocks
- **Reusable modals** — focus trapping, Escape/backdrop close, and responsive media handling
- **Memory Gallery** — scrapbook albums, a scroll-snap carousel, photo viewer, and safe image fallbacks
- **Social View** — album highlights/story viewer and personal memory feed from the same photo data
- **Receiver memory notes** — locally stored, color-coded notes shared across every presentation

## Adding gallery memories

Gallery content lives in `src/data/content.js` under `siteData.gallery.albums`. Photo IDs must be unique across every album because saved notes use the photo ID as their stable key.

To add an album:

1. Create `public/images/gallery/your-album/`.
2. Add a cover image to that directory.
3. Add an object to `gallery.albums` with a unique `id`, `title`, optional `description`, `coverImage`, and `photos` array.

To add a photo, place the image in its album directory and add this object to the album's `photos` array:

```js
{
  id: "globally-unique-photo-id",
  src: "/images/gallery/your-album/photo-name.jpg",
  alt: "A meaningful description of the photo",
  caption: "The caption shown in both views.",
  date: "2026-01-01"
}
```

Replace an included SVG by keeping its filename/path, or update `src`/`coverImage` for a JPG, PNG, WebP, or SVG. Broken paths use `public/images/gallery/memory-placeholder.svg` automatically.

Receiver notes and the preferred view are stored in the existing `birthdayGiftExperience` localStorage record. They are local browser keepsakes, not encrypted or server-synced data.

## 🛠 Tech Stack

- [Vite](https://vite.dev/) — build tool & dev server
- Vanilla JavaScript (ES modules)
- Vanilla CSS (custom properties, no utility framework)
- Google Fonts (Quicksand, Pacifico)

## 📦 Install

```bash
npm install
```

## 🚀 Development

```bash
npm run dev
```

Opens a local dev server with hot module replacement.

## 📁 Folder Overview

```
├── index.html                  # HTML shell
├── public/
│   ├── favicon.svg
│   ├── images/
│   │   └── placeholders/       # Placeholder SVG artwork
│   ├── audio/
│   │   └── background/         # Place background music here
│   └── video/                  # Place intro video here
└── src/
    ├── main.js                 # Entry point (CSS imports + boot)
    ├── data/
    │   └── content.js          # ★ All personalized content lives here
    ├── js/
    │   ├── app.js              # Main app controller
    │   ├── audio.js            # Audio manager
    │   ├── effects.js          # Confetti + visual effects
    │   ├── explore.js          # Explore Room and gift carousel
    │   ├── modal.js            # Reusable accessible modal manager
    │   └── storage.js          # Safe progress persistence
    └── styles/
        ├── main.css            # Design system + components
        ├── animations.css      # Keyframes + reduced-motion
        └── responsive.css      # Breakpoint adjustments
```

## 🎨 How to Personalize

Supabase is the primary source for creator-controlled site presentation. **`src/data/content.js`** remains the fallback and continues to own gifts, letters, and gallery data until their later migrations.

## 🏗 Build for Production

```bash
npm run build
```

Output goes to `dist/`.

## 📋 Known Limitations

- Gallery notes and view preference do not sync between devices or browsers.
- Photos are creator-configured; receiver uploads and cloud storage are outside V1.
- The standee video path is a placeholder until a real video is added; the modal shows a friendly fallback.
- The design uses Google Fonts via CDN — an internet connection is needed for the custom fonts (system fallbacks are provided).

## 📝 License

Private — made with 💕
# Supabase content management (Increment 6B)

Creator-controlled site content is loaded from Supabase before the experience starts. Copy `.env.example` to `.env` and provide browser-safe project credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-or-publishable-key
```

Never use a service-role key, database password, upload secret, or private integration credential in a `VITE_` variable. The shared client lives in `src/js/supabase.js`; all queries and normalization live in `src/js/site-content.js`. The configured V1.5 site slug is `happy-birthday-name`.

The published site row is resolved by slug through existing read RLS. Related content tables use the verified `gift_site_id` foreign-key column.

## Creator workflow

Use Supabase Dashboard as the temporary CMS. Referenced Storage objects must be publicly readable under the existing project policies.

- Change the celebrant or birthday message by editing `celebrant_name` or `birthday_message` on the published `gift_sites` row with slug `happy-birthday-name`.
- Add an intro slide by uploading to `site-media`, copying the public URL, and adding an `intro_slides` row with `image_url`, `alt_text`, and `display_order`.
- Reorder intro slides by changing `display_order`; lower values appear first.
- Switch slideshow/video with `site_settings.intro_type`.
- Replace the intro video by uploading it to `site-media` and updating `intro_video_url`.
- Replace the homepage character by uploading artwork to `site-media` and updating `homepage_character_url`.
- Replace global BGM by uploading to `audio` and updating `global_music_url`. A null URL intentionally gives a silent site.
- Add/edit a sticker through `interactive_stickers`: set `name`, `sticker_type`, `image_url`, optional `media_url`, `position_key`, and `display_order`.
- Remove/deactivate a sticker according to the existing publication/RLS workflow.

Sticker types are `petals`, `video`, `music`, and `decorative`. Positions are `top-left`, `top-right`, `side-left`, `side-right`, `bottom-left`, and `bottom-right`. Unknown positions use a safe default; database values are never executed as code or injected as arbitrary CSS.

Refresh the website after a Dashboard edit. No source edit, rebuild, deployment, or Realtime subscription is required.

## Fallback behavior

`src/data/content.js` remains the complete fallback. Missing environment variables, unavailable Supabase, request timeouts, missing rows, and invalid optional media do not blank the site. Supabase is primary for site presentation and published gifts/letters; albums and photos remain static, while annotations, comments, progress, and receiver preferences remain local.

## Supabase gifts and letters (Increment 6C)

Published gifts are loaded once by `src/js/gift-content.js`, then normalized into the same shape consumed by the Gift Carousel, Letter Archive, and shared Letter Reader. The service performs at most two content queries: one ordered published-letter query and one ordered `letter_blocks` query for all returned letter UUIDs. UI modules do not query Supabase independently.

### Create a letter manually

1. Upload the sender picture to `sender-media` and copy its public URL.
2. Upload the separate gift character to `sender-media`. A recommended path is `{giftSiteId}/{letter-or-sender}/character/`.
3. Optionally upload letter BGM to `audio` under `{giftSiteId}/letters/` and copy its public URL.
4. Create a `letters` row using the current site's `gift_site_id`. Set `sender_name`, `sender_photo_url`, `title`, optional legacy `content`, `character_image_url`, optional `music_url`, `display_order`, and `is_published`.
5. Prefer creating `letter_blocks` rows. Each needs the letter UUID, a stable unique `block_key` such as `p1`, paragraph `content`, and `display_order`.
6. Refresh the website. No source edit, rebuild, or redeployment is required.

Set `is_published = false` to remove a letter from the receiver experience. Change `display_order` to reorder carousel and archive entries. Draft/unpublished letters are never replaced with static fallback letters when Supabase is reachable; zero published letters produces an intentional empty state.

If no `letter_blocks` exist, legacy `letters.content` is split at blank lines into deterministic runtime IDs such as `legacy-p1`. Generated legacy blocks are not written back to Supabase.

Sender and character images are separate. Missing/broken sender images use `default-sender.svg`; missing/broken character images use the generic birthday character. Letter music remains managed by the existing Audio Manager, including global pause/resume, master volume, and mute.

Local reactions are keyed by the Supabase letter UUID plus `letter_blocks.block_key`. Old development reactions and viewed progress using IDs such as `gift-01` are intentionally not attached to new UUIDs. Previously viewed UUIDs remain stored when new letters are published, while completion is always recalculated against the current published UUID list.

Google Forms, Apps Script, and submission processing are not implemented yet.

## Gallery management (Increment 6D)

Published albums and photos are loaded once by `src/js/gallery-content.js`. Gallery, Social, and Highlight/Story views consume the same normalized album/photo objects; comments and favorites use the Supabase photo UUID as their localStorage identity.

### Creator workflow

1. Create an `albums` row with the current `gift_site_id`, title, optional description/cover URL, `display_order`, and `is_published`.
2. Upload images to `gallery-media/{giftSiteId}/albums/{album-name}/` and copy their public URLs.
3. Create `photos` rows with `album_id`, `image_url`, optional caption/alt text/date, `display_order`, and `is_published`.
4. Change `albums.display_order` or `photos.display_order` to reorder content; filenames do not control order.
5. Change `caption` or `photo_date` and refresh to update every view.
6. Set an album or photo `is_published = false` to remove it from the public experience.

`albums.cover_url` is preferred. Without one, the first published photo is used; empty albums use the existing memory placeholder. “All Memories” is derived from all published photos and requires no database album.

### Gallery views

- **Gallery View:** phone-gallery-inspired album library, album grids, All Memories, lightbox, favorites, and memory notes.
- **Social View:** album highlights plus one-photo post cards structured with an `images` array for future multi-image posts.
- **Highlight/Story View:** the same ordered `album.photos`, existing viewer controls, captions, dates, favorites, and notes.

Supabase is authoritative when reachable, including a legitimate zero-album state. Static gallery configuration is used only on query/configuration failure. Old static photo comments/favorites are not fuzzy-mapped to Supabase UUIDs. `source_submission_id` is retained in normalized photo data for future ingestion, but Google Forms and cloud comments are not implemented.
