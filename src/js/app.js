/**
 * App — Birthday Gift Experience
 *
 * Main application controller. Manages:
 * - Intro experience (slideshow / video)
 * - Homepage reveal sequence
 * - Audio toggle UI
 * - CTA placeholder
 */

import { siteData } from '../data/content.js';
import { burstConfetti } from './effects.js';
import {
  initAudio,
  playGlobalMusic,
  toggleMute,
  getMuted,
  onStateChange,
} from './audio.js';
import { renderExploreRoom } from './explore.js';
import { renderGallery } from './gallery.js';

// ── Constants ──
const INTRO_FADE_MS = 800;
const REVEAL_STEP_MS = 300; // delay between each homepage element

// ── State ──
let introTimer = null;
let currentSlide = 0;
let introKeyHandler = null;

/**
 * Boot the entire application.
 * Called once from main.js after DOM is ready.
 */
export function initApp() {
  const appEl = document.getElementById('app');
  appEl.innerHTML = buildHTML();

  initAudio();
  setupIntro();
  setupAudioToggle();
  setupCTA();
}

// ═════════════════════════════════════════════════
//  HTML CONSTRUCTION
// ═════════════════════════════════════════════════

function buildHTML() {
  return `
    ${buildIntroHTML()}
    ${buildHomepageHTML()}
    ${buildBackgroundDecor()}
    ${buildAudioToggle()}
  `;
}

function buildIntroHTML() {
  const { intro } = siteData;

  if (intro.type === 'video') {
    return `
      <div class="intro" id="intro" role="dialog" aria-label="Intro sequence">
        <div class="intro__video">
          <video id="intro-video" muted playsinline preload="auto">
            <source src="${intro.video}" type="video/mp4">
          </video>
          <button class="intro__video-play" id="intro-play-btn" aria-label="Play intro video">
            ▶ Play
          </button>
        </div>
        <button class="intro__skip" id="intro-skip" aria-label="Skip intro">
          Skip Intro ›
        </button>
      </div>
    `;
  }

  // Default: slideshow
  const slides = intro.slides || [];
  const slidesHTML = slides
    .map(
      (src, i) => `
      <div class="intro__slide ${i === 0 ? 'active' : ''}" data-slide="${i}">
        <img src="${src}" alt="Intro image ${i + 1}" loading="eager"
             onerror="this.style.display='none'">
      </div>
    `
    )
    .join('');

  const dotsHTML = slides
    .map(
      (_, i) =>
        `<div class="intro__progress-dot ${i === 0 ? 'active' : ''}" data-dot="${i}"></div>`
    )
    .join('');

  return `
    <div class="intro" id="intro" role="dialog" aria-label="Intro slideshow">
      <div class="intro__slideshow" aria-live="polite">
        ${slidesHTML}
      </div>
      <div class="intro__progress" role="group" aria-label="Slide progress">
        ${dotsHTML}
      </div>
      <button class="intro__skip" id="intro-skip" aria-label="Skip intro">
        Skip Intro ›
      </button>
    </div>
  `;
}

function buildHomepageHTML() {
  const { celebrant, homepage } = siteData;

  return `
    <main class="homepage" id="homepage" aria-label="Birthday homepage">
      <div class="homepage__character" id="homepage-character">
        <img src="${homepage.characterImage}"
             alt="Birthday character for ${celebrant.name}"
             onerror="this.parentElement.style.display='none'">
      </div>
      <div class="homepage__greeting" id="homepage-greeting">
        <p class="homepage__greeting-label">${homepage.greeting}</p>
        <h1 class="homepage__greeting-name">${celebrant.name}</h1>
        <p class="homepage__sub-greeting">${homepage.subGreeting}</p>
      </div>
      <button class="homepage__cta" id="homepage-cta" type="button">
        Explore your gift!
        <span class="homepage__cta-icon" aria-hidden="true">🎁</span>
      </button>
      <div class="homepage__placeholder-msg" id="placeholder-msg" aria-live="polite"></div>
    </main>
  `;
}

function buildBackgroundDecor() {
  return `
    <div class="bg-decor" aria-hidden="true">
      <div class="bg-decor__shape bg-decor__shape--1"></div>
      <div class="bg-decor__shape bg-decor__shape--2"></div>
      <div class="bg-decor__shape bg-decor__shape--3"></div>
    </div>
  `;
}

function buildAudioToggle() {
  return `
    <button class="audio-toggle" id="audio-toggle"
            aria-label="Toggle background music"
            title="Toggle music">
      🔇
    </button>
  `;
}

// ═════════════════════════════════════════════════
//  INTRO LOGIC
// ═════════════════════════════════════════════════

function setupIntro() {
  const introEl = document.getElementById('intro');
  const skipBtn = document.getElementById('intro-skip');
  if (!introEl) return;

  skipBtn?.addEventListener('click', () => endIntro());

  // Keyboard: Escape or Enter to skip
  introKeyHandler = (e) => {
    if (e.key === 'Escape' || e.key === 'Enter') {
      endIntro();
    }
  };
  document.addEventListener('keydown', introKeyHandler);

  if (siteData.intro.type === 'video') {
    setupVideoIntro();
  } else {
    setupSlideshowIntro();
  }
}

function setupSlideshowIntro() {
  const slides = document.querySelectorAll('.intro__slide');
  const dots = document.querySelectorAll('.intro__progress-dot');
  if (slides.length === 0) {
    endIntro();
    return;
  }

  const duration = siteData.intro.slideDuration || 3000;

  function showSlide(index) {
    slides.forEach((s, i) => s.classList.toggle('active', i === index));
    dots.forEach((d, i) => d.classList.toggle('active', i === index));
    currentSlide = index;
  }

  function advance() {
    const next = currentSlide + 1;
    if (next >= slides.length) {
      endIntro();
    } else {
      showSlide(next);
      introTimer = setTimeout(advance, duration);
    }
  }

  // Start the auto-advance cycle
  introTimer = setTimeout(advance, duration);
}

function setupVideoIntro() {
  const video = document.getElementById('intro-video');
  const playBtn = document.getElementById('intro-play-btn');
  if (!video) { endIntro(); return; }

  // Attempt autoplay (muted to comply with browser policy)
  const playPromise = video.play();
  if (playPromise && typeof playPromise.then === 'function') {
    playPromise
      .then(() => {
        // Autoplay succeeded — hide the manual play button
        playBtn?.classList.add('hidden');
      })
      .catch(() => {
        // Autoplay blocked — show the play button
        playBtn?.classList.remove('hidden');
      });
  }

  // Manual play button
  playBtn?.addEventListener('click', () => {
    video.play().catch(() => {});
    playBtn.classList.add('hidden');
  });

  // Handle missing video source
  video.addEventListener('error', () => endIntro(), { once: true });

  // When video ends, transition to homepage
  video.addEventListener('ended', () => endIntro(), { once: true });
}

/**
 * Transition from intro → homepage.
 */
function endIntro() {
  if (introTimer) {
    clearTimeout(introTimer);
    introTimer = null;
  }

  if (introKeyHandler) {
    document.removeEventListener('keydown', introKeyHandler);
    introKeyHandler = null;
  }

  const introEl = document.getElementById('intro');
  if (!introEl || introEl.classList.contains('fade-out')) return;

  introEl.classList.add('fade-out');

  // After the CSS fade completes, remove intro and reveal homepage
  setTimeout(() => {
    introEl.remove();
    revealHomepage();
  }, INTRO_FADE_MS);
}

// ═════════════════════════════════════════════════
//  HOMEPAGE REVEAL
// ═════════════════════════════════════════════════

function revealHomepage() {
  const homepage = document.getElementById('homepage');
  const character = document.getElementById('homepage-character');
  const greeting = document.getElementById('homepage-greeting');
  const cta = document.getElementById('homepage-cta');

  if (!homepage) return;

  // Make homepage visible
  homepage.classList.add('visible');

  // Staggered reveal sequence
  setTimeout(() => {
    burstConfetti();
  }, 100);

  setTimeout(() => {
    character?.classList.add('animate-in');
  }, REVEAL_STEP_MS);

  setTimeout(() => {
    greeting?.classList.add('animate-in');
  }, REVEAL_STEP_MS * 2);

  setTimeout(() => {
    cta?.classList.add('animate-in');
  }, REVEAL_STEP_MS * 3);

  // After all entrance animations, start idle float
  setTimeout(() => {
    character?.classList.add('idle');
  }, REVEAL_STEP_MS * 4);

  // Attempt to start background music after reveal
  setTimeout(() => {
    playGlobalMusic();
  }, REVEAL_STEP_MS * 3);
}

// ═════════════════════════════════════════════════
//  CTA (Explore your gift!)
// ═════════════════════════════════════════════════

function setupCTA() {
  const ctaBtn = document.getElementById('homepage-cta');
  ctaBtn?.addEventListener('click', handleExploreGift);
}

/**
 * Transition to Explore Room on CTA click.
 */
function handleExploreGift() {
  const appEl = document.getElementById('app');
  if (!appEl) return;

  const homepage = document.getElementById('homepage');
  homepage?.classList.add('exiting');

  // Let the homepage settle into a short transition before swapping views.
  setTimeout(() => {
    const showExplore = () => renderExploreRoom(appEl, () => initApp(), () => renderGallery(appEl, showExplore));
    showExplore();
  }, 280);
}

// ═════════════════════════════════════════════════
//  AUDIO TOGGLE
// ═════════════════════════════════════════════════

function setupAudioToggle() {
  const toggleBtn = document.getElementById('audio-toggle');
  if (!toggleBtn) return;

  function updateIcon(muted) {
    toggleBtn.textContent = muted ? '🔇' : '🔊';
    toggleBtn.setAttribute(
      'aria-label',
      muted ? 'Unmute background music' : 'Mute background music'
    );
  }

  toggleBtn.addEventListener('click', () => {
    toggleMute();
    updateIcon(getMuted());
  });

  // Sync if mute state changes elsewhere
  onStateChange(updateIcon);
}
