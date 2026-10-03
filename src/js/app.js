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
  pauseGlobalMusic,
  toggleMute,
  getMuted,
  getVolume,
  onStateChange,
} from './audio.js';
import { renderExploreRoom } from './explore.js';
import { renderGallery } from './gallery.js';
import { renderLetterArchive } from './letter-archive.js';
import { mountMusicToggle } from './music-toggle.js';
import { hasSeenIntro, markIntroSeen } from './storage.js';

// ── Constants ──
const INTRO_FADE_MS = 800;
const REVEAL_STEP_MS = 300; // delay between each homepage element

// ── State ──
let introTimer = null;
let currentSlide = 0;
let introKeyHandler = null;
let introAudioCleanup = null;
let introStartSoundCleanup = null;
const escapeHTML = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[char]));

/**
 * Boot the entire application.
 * Called once from main.js after DOM is ready.
 */
export function initApp() {
  const appEl = document.getElementById('app');
  const shouldPlayIntro = !hasSeenIntro();
  appEl.innerHTML = buildHTML(shouldPlayIntro);

  initAudio();
  mountMusicToggle(appEl);
  setupCTA();
  if (shouldPlayIntro) {
    markIntroSeen();
    setupIntro();
  } else {
    revealHomepage();
  }
}

// ═════════════════════════════════════════════════
//  HTML CONSTRUCTION
// ═════════════════════════════════════════════════

function buildHTML(includeIntro = true) {
  return `
    ${includeIntro ? buildIntroHTML() : ''}
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
          <video id="intro-video" autoplay muted playsinline preload="auto">
            <source src="${intro.video}" type="video/mp4">
          </video>
          <button class="intro__sound" id="intro-sound-btn" type="button" aria-pressed="false" aria-label="Turn on intro video sound" title="Turn sound on">🔇</button>
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
      (slide, i) => {
        const src = typeof slide === 'string' ? slide : slide?.src;
        const alt = typeof slide === 'string' ? `Intro image ${i + 1}` : (slide?.alt || `Intro image ${i + 1}`);
        return `
      <div class="intro__slide ${i === 0 ? 'active' : ''}" data-slide="${i}">
        <img src="${escapeHTML(src)}" alt="${escapeHTML(alt)}" loading="eager"
             onerror="this.style.display='none'">
      </div>
    `;
      }
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
        <img src="${escapeHTML(homepage.characterImage)}"
             alt="Birthday character for ${escapeHTML(celebrant.name)}"
             onerror="if(!this.src.endsWith('/images/placeholders/birthday-character.svg')){this.src='/images/placeholders/birthday-character.svg'}else{this.parentElement.style.display='none'}">
      </div>
      <div class="homepage__greeting" id="homepage-greeting">
        <p class="homepage__greeting-label">${escapeHTML(homepage.greeting)}</p>
        <h1 class="homepage__greeting-name">${escapeHTML(celebrant.name)}</h1>
        <p class="homepage__sub-greeting">${escapeHTML(homepage.subGreeting)}</p>
      </div>
      <button class="homepage__cta" id="homepage-cta" type="button">
        Explore your gift!
        <span class="homepage__cta-icon" aria-hidden="true">🎁</span>
      </button>
      <button class="homepage__replay-intro" id="homepage-replay-intro" type="button">
        Watch video intro ↻
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
  const soundBtn = document.getElementById('intro-sound-btn');
  if (!video) { endIntro(); return; }

  let soundEnabled = !getMuted();
  video.volume = getVolume();
  video.muted = getMuted();

  const syncIntroSound = (muted = getMuted(), volume = getVolume()) => {
    video.volume = volume;
    video.muted = muted || !soundEnabled;
    if (!soundBtn) return;
    const audible = soundEnabled && !muted;
    soundBtn.textContent = audible ? '🔊' : '🔇';
    soundBtn.setAttribute('aria-pressed', String(audible));
    soundBtn.setAttribute('aria-label', audible ? 'Mute intro video' : 'Turn on intro video sound');
    soundBtn.title = audible ? 'Mute sound' : 'Turn sound on';
  };
  introAudioCleanup = onStateChange(syncIntroSound);
  syncIntroSound();

  // Try the receiver's saved sound state first. If the browser blocks audible
  // autoplay, keep the video moving silently until the first user gesture.
  const playPromise = video.play();
  if (playPromise && typeof playPromise.then === 'function') {
    playPromise
      .catch(() => {
        soundEnabled = false;
        video.muted = true;
        syncIntroSound();
        video.play().catch(() => {});
      });
  }

  const startSoundFromGesture = (event) => {
    if (event.target instanceof Element && event.target.closest('#intro-sound-btn')) return;
    if (!getMuted()) {
      soundEnabled = true;
      syncIntroSound();
      video.play().catch(() => {});
    }
    introStartSoundCleanup?.();
  };
  document.addEventListener('pointerdown', startSoundFromGesture, { capture: true, once: true });
  document.addEventListener('keydown', startSoundFromGesture, { capture: true, once: true });
  introStartSoundCleanup = () => {
    document.removeEventListener('pointerdown', startSoundFromGesture, true);
    document.removeEventListener('keydown', startSoundFromGesture, true);
    introStartSoundCleanup = null;
  };

  soundBtn?.addEventListener('click', () => {
    const turningOn = video.muted;
    soundEnabled = turningOn;
    if (turningOn && getMuted()) toggleMute();
    syncIntroSound();
    if (turningOn) video.play().catch(() => {});
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

  introAudioCleanup?.();
  introAudioCleanup = null;
  introStartSoundCleanup?.();

  const introVideo = document.getElementById('intro-video');
  introVideo?.pause();

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
  mountMusicToggle(document.getElementById('app'));
  playGlobalMusic();

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

}

// ═════════════════════════════════════════════════
//  CTA (Explore your gift!)
// ═════════════════════════════════════════════════

function setupCTA() {
  const ctaBtn = document.getElementById('homepage-cta');
  ctaBtn?.addEventListener('click', handleExploreGift);
  document.getElementById('homepage-replay-intro')?.addEventListener('click', replayIntro);
}

function replayIntro() {
  const appEl = document.getElementById('app');
  if (!appEl || document.getElementById('intro')) return;
  pauseGlobalMusic(true);
  appEl.insertAdjacentHTML('afterbegin', buildIntroHTML());
  setupIntro();
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
    const viewHistory = [];
    let currentView = 'explore';

    const renderView = (view, remember = true) => {
      if (remember && view !== currentView) viewHistory.push(currentView);
      currentView = view;

      const goBack = () => renderView(viewHistory.pop() || 'explore', false);
      if (view === 'gallery') {
        renderGallery(appEl, goBack, () => renderView('letters'));
      } else if (view === 'letters') {
        renderLetterArchive(appEl, goBack);
      } else {
        renderExploreRoom(
          appEl,
          () => initApp(),
          () => renderView('gallery'),
          () => renderView('letters')
        );
      }
      mountMusicToggle(appEl);
      window.scrollTo({ top: 0, behavior: 'auto' });
    };

    renderView('explore', false);
  }, 280);
}

// ═════════════════════════════════════════════════
//  AUDIO TOGGLE
// ═════════════════════════════════════════════════
