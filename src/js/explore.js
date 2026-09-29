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

/**
 * Render and attach event handlers for the Explore Room inside #app
 * @param {HTMLElement} container
 * @param {() => void} onGoHome - Callback to return to homepage
 */
export function renderExploreRoom(container, onGoHome) {
  const allUnlocked = isAllUnlocked();
  const revealed = isGiftsRevealed();
  const configuredGifts = siteData.gifts || [];
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
          <button id="nav-gallery-btn" class="nav-link-btn ${allUnlocked ? 'unlocked' : 'locked'}" aria-label="Gallery">
            <span class="nav-icon">${allUnlocked ? '🖼️' : '🔒'}</span>
            <span class="nav-label">Gallery</span>
          </button>

          <button id="nav-letters-btn" class="nav-link-btn ${allUnlocked ? 'unlocked' : 'locked'}" aria-label="Letters">
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

        <!-- ROOM CENTER: Stickers + Click Me in flex layout -->
        <div class="room-center">
          <!-- Top row: poster sticker above -->
          <div class="room-top-row">
            ${stickers.filter(s => s.id === 'poster').map(s => renderStickerHTML(s)).join('')}
          </div>

          <!-- Main row: flower | click-me | standee -->
          <div class="room-main-row">
            <div class="room-side room-side-left">
              ${stickers.filter(s => s.id === 'flower').map(s => renderStickerHTML(s)).join('')}
            </div>

            <!-- CENTERPIECE: CLICK ME OBJECT -->
            <section id="click-me-section" class="click-me-section ${revealed ? 'is-revealed' : ''}">
              <button id="click-me-btn" class="click-me-btn" aria-label="Click me to reveal your birthday gifts">
                <div class="click-me-box">
                  <img src="/images/placeholders/intro-03.svg" alt="Gift Box" class="click-me-img" />
                  <div class="click-me-badge font-heading">${siteData.explore.clickMePrompt}</div>
                </div>
              </button>
            </section>

            <div class="room-side room-side-right">
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
    if (isAllUnlocked()) {
      openModal({
        title: '🖼️ Memory Gallery',
        bodyHTML: `<p>Your memory gallery has been unlocked! Full collection coming in the next surprise ✨</p>`,
      });
    } else {
      triggerLockedFeedback(galleryBtn, 'Secret! Access all gifts first! 🔒');
    }
  });

  // Navigation: Letters
  const lettersBtn = document.getElementById('nav-letters-btn');
  lettersBtn?.addEventListener('click', () => {
    if (isAllUnlocked()) {
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
      }
    });
  });

  // ── CLICK ME Reveal Sequence ──
  const clickMeBtn = document.getElementById('click-me-btn');
  const clickMeSection = document.getElementById('click-me-section');
  const carouselSection = document.getElementById('carousel-section');

  clickMeBtn?.addEventListener('click', () => {
    if (setGiftsRevealed(true)) {
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
  return `
    <button
      id="sticker-${sticker.id}"
      class="sticker-btn sticker-${sticker.id}"
      aria-label="${sticker.label}"
      title="${sticker.tooltip || sticker.label}"
    >
      <div class="sticker-inner">
        <img src="${sticker.image}" alt="${sticker.label}" class="sticker-img" />
        <span class="sticker-badge">${sticker.label}</span>
      </div>
    </button>
  `;
}

function renderGiftCharacterHTML(gift) {
  const viewed = isGiftViewed(gift.id);

  return `
    <div
      id="gift-card-${gift.id}"
      class="gift-character-card ${viewed ? 'is-viewed' : ''}"
      tabindex="0"
      role="button"
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
    </div>
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

  openModal({
    title: `${sticker.label}`,
    isVideo: true,
    bodyHTML: `
      <div class="video-modal-content">
        <video controls autoplay class="modal-video-element" onerror="this.style.display='none'; document.getElementById('video-fallback').style.display='block';">
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
}

function handleGiftCharacterClick(gift) {
  const configuredGifts = siteData.gifts || [];
  const configuredIds = configuredGifts.map((g) => g.id);

  // Mark viewed in storage
  const { isNewView, allViewedNow } = markGiftViewed(gift.id, configuredIds);

  // Update DOM badge
  const cardEl = document.getElementById(`gift-card-${gift.id}`);
  if (cardEl) {
    cardEl.classList.add('is-viewed');
    const badgeEl = cardEl.querySelector('.character-label-badge');
    if (badgeEl) {
      badgeEl.innerHTML = `
        <span class="sender-name">${gift.sender.name}</span>
        <span class="viewed-badge" title="Opened">💌</span>
      `;
    }
  }

  // Temporary preview modal as specified in Increment 2 requirements
  openModal({
    title: `Gift from ${gift.sender.name} 💌`,
    bodyHTML: `
      <div class="gift-preview-modal font-heading" style="text-align:center; padding: 15px;">
        <img src="${gift.characterImage}" alt="${gift.characterName}" style="width: 90px; height: 90px; margin: 0 auto 12px; display: block;" />
        <h3 style="margin-bottom: 8px; font-size: 1.3rem;">A letter from ${gift.sender.name}</h3>
        <p style="font-family: var(--font-body); font-size: 1rem; color: var(--color-text-light); margin-bottom: 16px;">
          "${gift.letter.preview}"
        </p>
        <div class="badge-pill" style="display:inline-block; background: var(--color-surface-warm); padding: 6px 14px; border-radius: 20px; font-size: 0.85rem; border: 1px dashed var(--color-primary);">
          [Full letter reader coming in the next surprise ✨]
        </div>
      </div>
    `,
  });

  // Dynamic completion check!
  if (allViewedNow) {
    setTimeout(() => {
      burstConfetti({ particleCount: 100, duration: 4000 });

      showToast('You found every gift! ✨ Secrets Unlocked!');

      // Update Header Navigation to unlocked state dynamically
      const galleryBtn = document.getElementById('nav-gallery-btn');
      if (galleryBtn) {
        galleryBtn.className = 'nav-link-btn unlocked';
        galleryBtn.innerHTML = `
          <span class="nav-icon">🖼️</span>
          <span class="nav-label">Gallery</span>
        `;
      }

      const lettersBtn = document.getElementById('nav-letters-btn');
      if (lettersBtn) {
        lettersBtn.className = 'nav-link-btn unlocked';
        lettersBtn.innerHTML = `
          <span class="nav-icon">💌</span>
          <span class="nav-label">Letters</span>
        `;
      }
    }, 400);
  }
}
