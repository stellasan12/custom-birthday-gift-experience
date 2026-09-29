# 🎂 Birthday Gift Experience

A cute, warm, and whimsical interactive birthday gift website — built as a polished single-page experience with Vite + Vanilla JavaScript.

## ✨ Features (Increment 1)

- **Intro slideshow** — cinematic opening with crossfade transitions and Ken Burns effect
- **Optional video intro** — just change one config value
- **Homepage reveal** — staggered entrance animation with confetti burst
- **Celebratory confetti** — lightweight canvas-based, auto-cleanup
- **Global audio infrastructure** — background music with browser autoplay policy compliance
- **Soft pastel design system** — CSS custom properties, Quicksand + Pacifico fonts
- **Fully responsive** — mobile (360px) → tablet (768px) → desktop (1440px+)
- **Accessible** — semantic HTML, keyboard navigation, focus states, reduced-motion support

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
    │   └── effects.js          # Confetti + visual effects
    └── styles/
        ├── main.css            # Design system + components
        ├── animations.css      # Keyframes + reduced-motion
        └── responsive.css      # Breakpoint adjustments
```

## 🎨 How to Personalize

All content is configured in **`src/data/content.js`**.

## 🏗 Build for Production

```bash
npm run build
```

Output goes to `dist/`.

## 📋 Known Limitations

- The "Explore your gift!" CTA shows a placeholder message — the gift room is planned for Increment 2.
- No real audio/video files are included — the app gracefully ignores missing media.
- The design uses Google Fonts via CDN — an internet connection is needed for the custom fonts (system fallbacks are provided).

## 📝 License

Private — made with 💕