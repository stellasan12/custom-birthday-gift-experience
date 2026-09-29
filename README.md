# 🎂 Birthday Gift Experience

A cute, warm, and whimsical interactive birthday gift website — built as a polished single-page experience with Vite + Vanilla JavaScript.

## ✨ Features (Increments 1–2)

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

All content is configured in **`src/data/content.js`**.

## 🏗 Build for Production

```bash
npm run build
```

Output goes to `dist/`.

## 📋 Known Limitations

- Gallery, Letter Archive, full letter reading, and customization controls are placeholders for future increments.
- The standee video path is a placeholder until a real video is added; the modal shows a friendly fallback.
- The design uses Google Fonts via CDN — an internet connection is needed for the custom fonts (system fallbacks are provided).

## 📝 License

Private — made with 💕
