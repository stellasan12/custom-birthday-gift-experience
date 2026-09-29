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
import { openModal, closeModal } from './modal.js';
import {
  isGiftsRevealed,
  setGiftsRevealed,
  isGiftViewed,
  markGiftViewed,
  isAllUnlocked,
  resetStorage,
} from './storage.js';
import { toggleMute, getMuted } from './audio.js';
import { openLetter } from './letter-reader.js';

/**
 * Render and attach event handlers for the Explore Room inside #app
 * @param {HTMLElement} container
 * @param {() => void} onGoHome - Callback to return to homepage
 */
export function renderExploreRoom(container, onGoHome, onOpenGallery) {
  const configuredGifts = siteData.gifts || [];
  const configuredGiftIds = configuredGifts.map((gift) => gift.id);
  const allUnlocked = isAllUnlocked(configuredGiftIds);
  const revealed = isGiftsRevealed();
  const stickers = siteData.stickers || [];

  container.innerHTML = `
    <div class="explore-wrapper fade-in">
      <!-- HEADER NAVIGATION BAR -->
      <header class="explore-header card-glass">
        <div class="header-left">
          <button id="nav-home-btn" class="nav-brand-btn" aria-label="Return to Homepage">
            <span class="nav-logo-icon">🏠</span>
            <span class="nav-title font-heading">${siteData.celebrant.name}</span>
          </button>
        </div>

        <nav class="header-nav" aria-label="Explore Navigation">
          <button id="nav-gallery-btn" class="nav-link-btn ${allUnlocked ? 'unlocked' : 'locked'}" aria-label="Gallery${allUnlocked ? '' : '. Secret! Access all gifts first!'}" ${allUnlocked ? '' : 'data-tooltip="Secret! Access all gifts first!"'}>
            <span class="nav-icon">${allUnlocked ? '🖼️' : '🔒'}</span>
            <span class="nav-label">Gallery</span>
          </button>

          <button id="nav-letters-btn" class="nav-link-btn ${allUnlocked ? 'unlocked' : 'locked'}" aria-label="Letters${allUnlocked ? '' : '. Secret nganiiiii! Access all gifts first'}" ${allUnlocked ? '' : 'data-tooltip="Secret nganiiiii! Access all gifts first"'}>
            <span class="nav-icon">${allUnlocked ? '💌' : '🔒'}</span>
            <span class="nav-label">Letters</span>
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
          <!-- Poster hanging on top-right wall behind/above standee -->
          <div class="room-wall-poster">
            ${stickers.filter(s => s.id === 'poster').map(s => renderStickerHTML(s)).join('')}
          </div>

          <!-- Floor Row: Objects standing together on the room floor -->
          <div class="room-floor-row">
            <!-- Flower bouquet on bottom left -->
            <div class="room-floor-item item-flower">
              ${stickers.filter(s => s.id === 'flower').map(s => renderStickerHTML(s)).join('')}
            </div>

            <!-- Custom Object Sticker (Ezer) -->
            <div class="room-floor-item item-custom-object">
              ${stickers.filter(s => s.id === 'custom-object').map(s => renderStickerHTML(s)).join('')}
            </div>

            <!-- CENTERPIECE: CLICK ME PENGUIN -->
            <section id="click-me-section" class="click-me-section room-floor-item item-penguin ${revealed ? 'is-revealed' : ''}">
              <button id="click-me-btn" class="click-me-btn" aria-label="Click me to reveal your birthday gifts">
                <div class="click-me-box">
                  <img src="/images/stickers/holding-gift.png" alt="Gift Box" class="click-me-img" />
                  <div class="click-me-badge font-heading">${siteData.explore.clickMePrompt}</div>
                </div>
              </button>
            </section>

            <!-- Standee (Mingyu) standing right next to Penguin -->
            <div class="room-floor-item item-standee">
              ${stickers.filter(s => s.id === 'standee').map(s => renderStickerHTML(s)).join('')}
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
              ${configuredGifts.map((gift) => renderGiftCharacterHTML(gift)).join('')}
            </div>

            <button id="carousel-next" class="carousel-nav-btn next" aria-label="Next gift character">&rarr;</button>
          </div>
        </section>
      </main>
    </div>
  `;

  // ═════════════════════════════════════════════════
  // EVENT ATTACHMENTS & INTERACTION LOGIC
  // ═════════════════════════════════════════════════

  // Home navigation
  document.getElementById('nav-home-btn')?.addEventListener('click', () => {
    if (onGoHome) onGoHome();
  });

  // Audio Toggle
  const audioBtn = document.getElementById('audio-toggle-room');
  audioBtn?.addEventListener('click', () => {
    const isNowMuted = toggleMute();
    audioBtn.textContent = isNowMuted ? '🔇' : '🔊';
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
      openModal({
        title: '💌 Letter Collection',
        bodyHTML: `<p>Your letter collection has been unlocked! Full letter reader coming soon ✨</p>`,
      });
    } else {
      triggerLockedFeedback(lettersBtn, 'Secret nganiiiii! Access all gifts first 🔒');
    }
  });

  // Navigation: Settings & Reset Progress
  const settingsBtn = document.getElementById('nav-settings-btn');
  settingsBtn?.addEventListener('click', () => {
    openModal({
      title: '⚙️ Settings',
      bodyHTML: `
        <div style="text-align: center; padding: 10px;">
          <p style="margin-bottom: 12px; font-weight: 600;">Customization controls coming soon!</p>
          <p style="font-size: 0.85rem; opacity: 0.85; margin-bottom: 20px;">You will be able to change themes, music, and display preferences here in a future update.</p>
          <hr style="border: 0; border-top: 1px dashed var(--color-border); margin: 16px 0;" />
          <button id="reset-progress-btn" class="nav-link-btn" style="margin: 0 auto; background: #FFF0EB; border-color: var(--color-primary); color: #D9534F;">
            🔄 Reset All Progress
          </button>
        </div>
      `,
    });

    setTimeout(() => {
      document.getElementById('reset-progress-btn')?.addEventListener('click', () => {
        resetStorage();
        closeModal();
        showToast('Progress reset! Restarting experience... 🔄');
        setTimeout(() => {
          if (onGoHome) {
            onGoHome();
          } else {
            location.reload();
          }
        }, 400);
      });
    }, 50);
  });

  // ── Sticker Interactions ──
  stickers.forEach((sticker) => {
    const el = document.getElementById(`sticker-${sticker.id}`);
    if (!el) return;

    el.addEventListener('click', () => {
      if (sticker.type === 'petals') {
        showerPetals({ count: 40, duration: 4500 });
        showToast('Flower magic activated! 🌸✨');
      } else if (sticker.type === 'video') {
        openVideoModal(sticker);
      } else if (sticker.type === 'music') {
        const isMutedNow = toggleMute();
        audioBtn.textContent = isMutedNow ? '🔇' : '🔊';
        showToast(isMutedNow ? 'Background music paused 🎵' : 'Background music playing 🎵');
      } else if (sticker.type === 'custom') {
        showToast('Object slot ready! Add your image path in content.js 📦');
      }
    });
  });

  // ── CLICK ME Reveal Sequence ──
  const clickMeBtn = document.getElementById('click-me-btn');
  const clickMeSection = document.getElementById('click-me-section');
  const carouselSection = document.getElementById('carousel-section');

  clickMeBtn?.addEventListener('click', () => {
    if (!clickMeSection.classList.contains('is-revealed')) {
      setGiftsRevealed(true);
      // Execute satisfying reveal sequence
      clickMeBtn.classList.add('shake-wiggle');
      burstConfetti({ particleCount: 60, duration: 2500 });

      setTimeout(() => {
        clickMeSection.classList.add('is-revealed');
        carouselSection.classList.remove('is-hidden');
        carouselSection.classList.add('is-visible', 'slide-in-up');
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
        class="sticker-btn sticker-placeholder-box"
        title="${sticker.tooltip || 'Add Object Later'}"
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
      class="sticker-btn sticker-${sticker.id}"
      title="${sticker.tooltip || sticker.label}"
      aria-label="${sticker.tooltip || sticker.label}"
    >
      <div class="sticker-inner">
        <img src="${sticker.image}" alt="${sticker.label}" class="sticker-img" />
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
          <img src="${gift.characterImage}" alt="${gift.characterName}" class="character-img" />
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

function triggerLockedFeedback(element, message) {
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
