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

`src/data/content.js` remains the complete fallback. Missing environment variables, unavailable Supabase, request timeouts, missing rows, and invalid optional media do not blank the site. Database values replace only the creator-controlled fields in this increment. Gifts, letters, sender content, albums, photos, annotations, comments, progress, and receiver preferences stay in their existing sources.
