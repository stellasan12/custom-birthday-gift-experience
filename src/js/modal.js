/**
 * Modal Manager — Birthday Gift Experience
 *
 * Generic, accessible modal dialog system.
 * Supports:
 * - Backdrop click to close
 * - Close button (X)
 * - Escape key to close
 * - Focus trapping / accessibility
 * - Pause & resume global BGM when opening video modal
 */

import { pauseGlobalMusic, playGlobalMusic, getMuted } from './audio.js';

let activeModalEl = null;
let escListener = null;
let bgmWasPlayingBeforeModal = false;

/**
 * Open a modal with custom HTML content.
 * @param {Object} options
 * @param {string} options.title
 * @param {string} options.bodyHTML
 * @param {boolean} [options.isVideo] - Whether the modal contains a playing video
 * @param {() => void} [options.onClose] - Callback fired on close
 */
export function openModal({ title, bodyHTML, isVideo = false, onClose }) {
  closeModal(); // Close any active modal first

  if (isVideo) {
    // If BGM is active and unmuted, pause it temporarily while video is playing
    bgmWasPlayingBeforeModal = !getMuted();
    if (bgmWasPlayingBeforeModal) {
      pauseGlobalMusic();
    }
  }

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  backdrop.setAttribute('aria-label', title || 'Modal Window');

  backdrop.innerHTML = `
    <div class="modal-card card-glass">
      <div class="modal-header">
        <h3 class="modal-title font-heading">${title}</h3>
        <button class="modal-close-btn" aria-label="Close modal">&times;</button>
      </div>
      <div class="modal-body">
        ${bodyHTML}
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);
  activeModalEl = backdrop;

  // Fade in modal
  requestAnimationFrame(() => {
    backdrop.classList.add('is-visible');
  });

  const closeBtn = backdrop.querySelector('.modal-close-btn');
  closeBtn?.focus();

  const handleClose = () => {
    closeModal();
    if (onClose) onClose();
  };

  closeBtn?.addEventListener('click', handleClose);

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) {
      handleClose();
    }
  });

  escListener = (e) => {
    if (e.key === 'Escape') {
      handleClose();
    }
  };
  document.addEventListener('keydown', escListener);
}

/**
 * Close currently active modal.
 */
export function closeModal() {
  if (!activeModalEl) return;

  const current = activeModalEl;
  activeModalEl = null;

  if (escListener) {
    document.removeEventListener('keydown', escListener);
    escListener = null;
  }

  // Pause video if modal contained one
  const videoEl = current.querySelector('video');
  if (videoEl) {
    videoEl.pause();
    videoEl.src = ''; // stop loading
  }

  // Resume BGM if it was temporarily paused by video
  if (bgmWasPlayingBeforeModal) {
    bgmWasPlayingBeforeModal = false;
    playGlobalMusic();
  }

  current.classList.remove('is-visible');
  setTimeout(() => {
    if (current.parentNode) {
      current.parentNode.removeChild(current);
    }
  }, 300);
}
