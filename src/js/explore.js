/**
 * Explore Room — Birthday Gift Experience (Increment 2)
 *
 * Manages the digital bedroom / scrapbook gift room:
 * - Header navigation & secret locked items
 * - Interactive decorative stickers (Flower shower, Standee video, Poster BGM toggle)
 * - Central "CLICK ME" gift reveal sequence
 * - Horizontal character gift carousel
 * - Progress tracking & dynamic completion unlocking
 */

import { siteData } from '../data/content.js';
import { burstConfetti, showerPetals } from './effects.js';
import { openModal } from './modal.js';
import {
  isGiftsRevealed,
  setGiftsRevealed,
  isGiftViewed,
  markGiftViewed,
  isAllUnlocked,
  getAwakenedStickerIds,
  markStickerAwakened,
} from './storage.js';
import { getMuted, setMuted, toggleStickerMusic } from './audio.js';
import { openLetter } from './letter-reader.js';
import { openSettings } from './settings.js';
import { playSoundEffect } from './sound-effects.js';

const escapeHTML = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
const awakenedStickerIds = new Set();

/**
 * Render and attach event handlers for the Explore Room inside #app
 * @param {HTMLElement} container
 * @param {() => void} onGoHome - Callback to return to homepage
 */
export function renderExploreRoom(container, onGoHome, onOpenGallery, onOpenLetters) {
  const configuredGifts = siteData.gifts || [];
  const configuredGiftIds = configuredGifts.map((gift) => gift.id);
  const allUnlocked = isAllUnlocked(configuredGiftIds);
  const revealed = isGiftsRevealed();
  const stickers = siteData.stickers || [];
  awakenedStickerIds.clear();
  getAwakenedStickerIds().forEach((id) => awakenedStickerIds.add(id));

  container.innerHTML = `
    <div class="explore-wrapper fade-in">
      <!-- HEADER NAVIGATION BAR -->
      <header class="explore-header card-glass">
        <div class="header-left">
          <button id="nav-home-btn" class="nav-brand-btn" aria-label="Return to Homepage">
            <img class="nav-site-character" src="${escapeHTML(siteData.homepage?.characterImage || '/images/placeholders/birthday-character.svg')}" alt="" onerror="this.src='/images/placeholders/birthday-character.svg'">
            <span class="nav-title font-heading">${escapeHTML(siteData.celebrant.name)}</span>
          </button>
        </div>

        <nav class="header-nav" aria-label="Explore Navigation">
          <button id="nav-gallery-btn" class="nav-link-btn ${allUnlocked ? 'unlocked' : 'locked'}" aria-label="${allUnlocked ? 'Gallery' : 'Secret destination. Access all gifts first'}" ${allUnlocked ? '' : 'data-tooltip="Secret! Access all gifts first!"'}>
            <span class="nav-icon">${allUnlocked ? '🖼️' : '🔒'}</span>
            <span class="nav-label">${allUnlocked ? 'Gallery' : 'Secret'}</span>
          </button>

          <button id="nav-letters-btn" class="nav-link-btn ${allUnlocked ? 'unlocked' : 'locked'}" aria-label="${allUnlocked ? 'Letters' : 'Secret destination. Access all gifts first'}" ${allUnlocked ? '' : 'data-tooltip="Secret! Access all gifts first"'}>
            <span class="nav-icon">${allUnlocked ? '💌' : '🔒'}</span>
            <span class="nav-label">${allUnlocked ? 'Letters' : 'Secret'}</span>
          </button>

          <button id="nav-settings-btn" class="nav-link-btn" aria-label="Settings">
            <span class="nav-icon">⚙️</span>
            <span class="nav-label">Settings</span>
          </button>
        </nav>

        <div class="header-right">
          <button id="audio-toggle-room" class="audio-toggle" aria-label="Toggle background music">
            ${getMuted() ? '🔇' : '🔊'}
          </button>
        </div>
      </header>

      <!-- ROOM CONTENT -->
      <main class="explore-room">
        <!-- TOAST CONTAINER FOR LOCKED MESSAGES -->
        <div id="toast-container" class="toast-container" aria-live="polite"></div>

        <!-- ROOM STAGE: Cozy bedroom background with wall poster & floor baseline -->
        <div class="room-stage card-glass">
          <div class="room-background" aria-hidden="true">
            <div class="room-window"><span></span><span></span></div>
            <div class="room-shelf"><i></i><i></i><i></i></div>
            <div class="room-bed"><span></span></div>
            <div class="room-rug"></div>
            <div class="room-baseboard"></div>
          </div>
          <div class="room-wall-poster">
            ${stickers.filter((sticker) => getStickerPosition(sticker) === 'top-right').map(renderStickerHTML).join('')}
          </div>
          <div class="room-sticker-top-left">
            ${stickers.filter((sticker) => getStickerPosition(sticker) === 'top-left').map(renderStickerHTML).join('')}
          </div>

          <!-- Floor Row: Objects standing together on the room floor -->
          <div class="room-floor-row">
            <div class="room-floor-item item-flower">
              ${stickers.filter((sticker) => getStickerPosition(sticker) === 'bottom-left').map(renderStickerHTML).join('')}
            </div>

            <div class="room-floor-item item-custom-object">
              ${stickers.filter((sticker) => getStickerPosition(sticker) === 'side-left').map(renderStickerHTML).join('')}
            </div>

            <!-- CENTERPIECE: CLICK ME PENGUIN -->
            <section id="click-me-section" class="click-me-section room-floor-item item-penguin ${revealed ? 'is-revealed' : ''}">
              <button id="click-me-btn" class="click-me-btn" aria-label="${revealed ? 'Hide birthday gifts' : 'Show birthday gifts'}" aria-expanded="${revealed}">
                <div class="click-me-box">
                  <img src="/images/stickers/holding-gift.png" alt="Gift Box" class="click-me-img" />
                  <div class="click-me-badge font-heading">${siteData.explore.clickMePrompt}</div>
                </div>
              </button>
            </section>

            <div class="room-floor-item item-standee">
              ${stickers.filter((sticker) => ['bottom-right', 'side-right'].includes(getStickerPosition(sticker))).map(renderStickerHTML).join('')}
            </div>

          </div>
        </div>

        <!-- CAROUSEL SECTION -->
        <section id="carousel-section" class="carousel-section ${revealed ? 'is-visible' : 'is-hidden'}">
          <div class="carousel-intro font-heading">
            <h2>${siteData.explore.revealText}</h2>
          </div>

          <div class="carousel-viewport-wrapper">
            <button id="carousel-prev" class="carousel-nav-btn prev" aria-label="Previous gift character">&larr;</button>

            <div id="carousel-track" class="carousel-track" tabIndex="0" role="region" aria-label="Gift Carousel">
              ${configuredGifts.length ? configuredGifts.map((gift) => renderGiftCharacterHTML(gift)).join('') : '<p class="gift-empty-state">A few surprises are still being wrapped... 💌</p>'}
            </div>

            <button id="carousel-next" class="carousel-nav-btn next" aria-label="Next gift character">&rarr;</button>
          </div>
        </section>
      </main>
      <footer class="explore-footer">
        <span>A little birthday corner from your</span>
        <strong>SPIRITUAL FAM, Inc. ♡</strong>
      </footer>
    </div>
  `;

  // ═════════════════════════════════════════════════
  // EVENT ATTACHMENTS & INTERACTION LOGIC
  // ═════════════════════════════════════════════════

  // Home navigation
  document.getElementById('nav-home-btn')?.addEventListener('click', () => {
    if (onGoHome) onGoHome();
  });

  // Navigation: Gallery
  const galleryBtn = document.getElementById('nav-gallery-btn');
  galleryBtn?.addEventListener('click', () => {
    if (isAllUnlocked(configuredGiftIds)) {
      onOpenGallery?.();
    } else {
      triggerLockedFeedback(galleryBtn, 'Secret! Access all gifts first! 🔒');
    }
  });

  // Navigation: Letters
  const lettersBtn = document.getElementById('nav-letters-btn');
  lettersBtn?.addEventListener('click', () => {
    if (isAllUnlocked(configuredGiftIds)) {
      onOpenLetters?.();
    } else {
      triggerLockedFeedback(lettersBtn, 'Secret nganiiiii! Access all gifts first 🔒');
    }
  });

  // Settings preserves sentimental content and resets preferences only.
  const settingsBtn = document.getElementById('nav-settings-btn');
  settingsBtn?.addEventListener('click', openSettings);

  // ── Sticker Interactions ──
  stickers.forEach((sticker) => {
    const el = document.getElementById(`sticker-${sticker.id}`);
    if (!el) return;
    let attempts = awakenedStickerIds.has(sticker.id) ? 3 : 0;

    el.addEventListener('click', () => {
      attempts += 1;
      if (attempts < 3) {
        showToast('3 times is the magic');
        return;
      }
      if (attempts === 3) {
        awakenedStickerIds.add(sticker.id);
        markStickerAwakened(sticker.id);
        el.classList.remove('is-dormant');
        el.classList.add('is-awake');
        playSoundEffect('unlock');
      } else playSoundEffect('click');
      activateSticker(sticker);
    });
  });

  // ── CLICK ME Reveal Sequence ──
  const clickMeBtn = document.getElementById('click-me-btn');
  const clickMeSection = document.getElementById('click-me-section');
  const carouselSection = document.getElementById('carousel-section');

  clickMeBtn?.addEventListener('click', () => {
    const currentlyVisible = !carouselSection.classList.contains('is-hidden');
    if (currentlyVisible) {
      setGiftsRevealed(false);
      clickMeSection.classList.remove('is-revealed');
      carouselSection.classList.remove('is-visible', 'slide-in-up');
      carouselSection.classList.add('is-hidden');
      clickMeBtn.setAttribute('aria-expanded', 'false');
      clickMeBtn.setAttribute('aria-label', 'Show birthday gifts');
    } else {
      setGiftsRevealed(true);
      // Execute satisfying reveal sequence
      clickMeBtn.classList.add('shake-wiggle');
      burstConfetti({ particleCount: 60, duration: 2500 });

      setTimeout(() => {
        clickMeSection.classList.add('is-revealed');
        carouselSection.classList.remove('is-hidden');
        carouselSection.classList.add('is-visible', 'slide-in-up');
        clickMeBtn.setAttribute('aria-expanded', 'true');
        clickMeBtn.setAttribute('aria-label', 'Hide birthday gifts');
      }, 500);
    }
  });

  // ── Carousel Scrolling & Touch Navigation ──
  const track = document.getElementById('carousel-track');
  const prevBtn = document.getElementById('carousel-prev');
  const nextBtn = document.getElementById('carousel-next');

  if (track && prevBtn && nextBtn) {
    prevBtn.addEventListener('click', () => {
      track.scrollBy({ left: -260, behavior: 'smooth' });
    });

    nextBtn.addEventListener('click', () => {
      track.scrollBy({ left: 260, behavior: 'smooth' });
    });

    track.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      track.scrollBy({
        left: event.key === 'ArrowLeft' ? -260 : 260,
        behavior: 'smooth',
      });
    });
  }

  // ── Gift Character Clicks ──
  configuredGifts.forEach((gift) => {
    const giftEl = document.getElementById(`gift-card-${gift.id}`);
    if (!giftEl) return;

    giftEl.addEventListener('click', () => {
      handleGiftCharacterClick(gift);
    });
  });
}

// ═════════════════════════════════════════════════
//  HELPER FUNCTIONS & MODALS
// ═════════════════════════════════════════════════

function renderStickerHTML(sticker) {
  if (!sticker.image) {
    return `
      <button
        id="sticker-${sticker.id}"
        class="sticker-btn sticker-placeholder-box ${awakenedStickerIds.has(sticker.id) ? 'is-awake' : 'is-dormant'}"
        title="${escapeHTML(sticker.tooltip || 'Add Object Later')}"
        aria-label="Object Placeholder Box"
      >
        <div class="placeholder-box-inner">
          <span class="placeholder-plus">+</span>
          <span class="placeholder-label">Add Object</span>
        </div>
      </button>
    `;
  }

  return `
    <button
      id="sticker-${sticker.id}"
      class="sticker-btn sticker-${sticker.id} ${awakenedStickerIds.has(sticker.id) ? 'is-awake' : 'is-dormant'}"
      title="${escapeHTML(sticker.tooltip || sticker.label)}"
      aria-label="${escapeHTML(sticker.tooltip || sticker.label)}"
    >
      <div class="sticker-inner">
        <img src="${escapeHTML(sticker.image)}" alt="${escapeHTML(sticker.label)}" class="sticker-img" onerror="this.closest('.sticker-btn')?.setAttribute('hidden','')" />
      </div>
    </button>
  `;
}

function renderGiftCharacterHTML(gift) {
  const viewed = isGiftViewed(gift.id);

  return `
    <button
      id="gift-card-${gift.id}"
      class="gift-character-card ${viewed ? 'is-viewed' : ''}"
      type="button"
      aria-label="Gift from ${gift.sender.name}"
    >
      <div class="character-platform">
        <div class="character-img-wrapper">
          <img src="${escapeHTML(gift.characterImage)}" alt="${escapeHTML(gift.characterName)}" class="character-img" onerror="if(!this.src.endsWith('/images/placeholders/birthday-character.svg'))this.src='/images/placeholders/birthday-character.svg'" />
        </div>
        <div class="character-shadow"></div>
      </div>

      <div class="character-label-badge font-heading">
        <span class="sender-name">${gift.sender.name}</span>
        ${viewed ? '<span class="viewed-badge" title="Opened">💌</span>' : '<span class="unopened-badge" title="Unopened">🎁</span>'}
      </div>
    </button>
  `;
}

function activateSticker(sticker) {
  if (sticker.type === 'petals') {
    const gardenStyle = sticker.petalStyle === 'garden'
      || sticker.id === 'custom-object'
      || sticker.label?.trim().toLowerCase() === 'ezer';
    showerPetals({ count: gardenStyle ? 30 : 40, duration: 4500, style: gardenStyle ? 'garden' : 'classic' });
    showToast(gardenStyle ? 'A little garden is blooming! 🌼✨' : 'Flower magic activated! 🌸✨');
  } else if (sticker.type === 'video') {
    openVideoModal(sticker);
  } else if (sticker.type === 'music') {
    // The poster itself behaves as a sound toggle: play audibly, then stop and mute.
    if (getMuted()) setMuted(false);
    const playing = toggleStickerMusic(sticker.music || sticker.media);
    if (!playing) setMuted(true);
    showToast(playing ? 'Sticker music playing 🎵' : 'Stick music stopped 🎵');
  } else {
    showToast('A special little keepsake 📦');
  }
}

function triggerLockedFeedback(element, message) {
  playSoundEffect('locked');
  element.classList.remove('shake-wiggle');
  // Trigger reflow to restart animation
  void element.offsetWidth;
  element.classList.add('shake-wiggle');

  showToast(message);
}

function showToast(message) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast-bubble font-heading fade-in';
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 400);
  }, 2600);
}

function openVideoModal(sticker) {
  const videoSrc = sticker.video || '/video/standee-placeholder.mp4';

  const modal = openModal({
    title: `${sticker.label}`,
    isVideo: true,
    modalClass: sticker.label?.toLowerCase().includes('mingyu') ? 'mingyu-video-modal' : 'sticker-video-modal',
    bodyHTML: `
      <div class="video-modal-content">
        <video controls autoplay playsinline class="modal-video-element">
          <source src="${videoSrc}" type="video/mp4" />
          Your browser does not support HTML video.
        </video>
        <div id="video-fallback" class="video-fallback-box" style="display:none; padding:20px; text-align:center;">
          <p>🎬 <strong>Star Performance Video Placeholder</strong></p>
          <p style="font-size:0.85rem; margin-top:8px; opacity:0.8;">Place your video file at <code>${videoSrc}</code> to watch it here!</p>
        </div>
      </div>
    `,
  });

  const video = modal?.querySelector('video');
  const fallback = modal?.querySelector('#video-fallback');
  video?.addEventListener('error', () => {
    video.hidden = true;
    if (fallback) fallback.style.display = 'block';
  }, { once: true });
}

function getStickerPosition(sticker) {
  const allowed = new Set(['top-left', 'top-right', 'side-left', 'side-right', 'bottom-left', 'bottom-right']);
  if (allowed.has(sticker.positionKey)) return sticker.positionKey;
  return ({ flower: 'bottom-left', standee: 'bottom-right', poster: 'top-right', 'custom-object': 'side-left' })[sticker.id] || 'bottom-left';
}

function handleGiftCharacterClick(gift) {
  const configuredGifts = siteData.gifts || [];
  const configuredIds = configuredGifts.map((g) => g.id);

  // Mark viewed in storage
  const { allViewedNow } = markGiftViewed(gift.id, configuredIds);

  // Update DOM badge
  const cardEl = document.getElementById(`gift-card-${gift.id}`);
  if (cardEl) {
    cardEl.classList.add('is-viewed');
    cardEl.classList.remove('gift-selected');
    void cardEl.offsetWidth;
    cardEl.classList.add('gift-selected');
    const badgeEl = cardEl.querySelector('.character-label-badge');
    if (badgeEl) {
      badgeEl.innerHTML = `
        <span class="sender-name">${gift.sender.name}</span>
        <span class="viewed-badge" title="Opened">💌</span>
      `;
    }
  }

  openLetter(gift.id);
  setTimeout(() => cardEl?.classList.remove('gift-selected'), 260);

  // Dynamic completion check!
  if (allViewedNow) {
    setTimeout(() => {
      burstConfetti({ particleCount: 100, duration: 4000 });

      showToast('You found every gift! ✨ Secrets Unlocked!');

      // Update Header Navigation to unlocked state dynamically
      const galleryBtn = document.getElementById('nav-gallery-btn');
      if (galleryBtn) {
        galleryBtn.className = 'nav-link-btn unlocked';
        galleryBtn.removeAttribute('data-tooltip');
        galleryBtn.setAttribute('aria-label', 'Gallery, unlocked');
        galleryBtn.innerHTML = `
          <span class="nav-icon">🖼️</span>
          <span class="nav-label">Gallery</span>
        `;
      }

      const lettersBtn = document.getElementById('nav-letters-btn');
      if (lettersBtn) {
        lettersBtn.className = 'nav-link-btn unlocked';
        lettersBtn.removeAttribute('data-tooltip');
        lettersBtn.setAttribute('aria-label', 'Letters, unlocked');
        lettersBtn.innerHTML = `
          <span class="nav-icon">💌</span>
          <span class="nav-label">Letters</span>
        `;
      }
    }, 400);
  }
}
