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

import { pauseGlobalMusic, playGlobalMusic, isGlobalMusicPlaying } from './audio.js';

let activeModalEl = null;
let escListener = null;
let bgmWasPlayingBeforeModal = false;
let previouslyFocusedElement = null;
let previousBodyOverflow = '';

/**
 * Open a modal with custom HTML content.
 * @param {Object} options
 * @param {string} options.title
 * @param {string} options.bodyHTML
 * @param {boolean} [options.isVideo] - Whether the modal contains a playing video
 * @param {() => void} [options.onClose] - Callback fired on close
 * @param {() => boolean} [options.beforeClose] - Return false to cancel closing
 * @param {string} [options.modalClass] - Additional class for the modal card
 */
export function openModal({ title, bodyHTML, isVideo = false, onClose, beforeClose, modalClass = '' }) {
  closeModal(); // Close any active modal first

  previouslyFocusedElement = document.activeElement;

  if (isVideo) {
    // If BGM is active and unmuted, pause it temporarily while video is playing
    bgmWasPlayingBeforeModal = isGlobalMusicPlaying();
    if (bgmWasPlayingBeforeModal) {
      pauseGlobalMusic(true);
    }
  }

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  const titleId = `modal-title-${Date.now()}`;
  backdrop.setAttribute('aria-labelledby', titleId);

  backdrop.innerHTML = `
    <div class="modal-card card-glass ${modalClass}">
      <div class="modal-header">
        <h3 class="modal-title font-heading" id="${titleId}">${title}</h3>
        <button class="modal-close-btn" aria-label="Close modal">&times;</button>
      </div>
      <div class="modal-body">
        ${bodyHTML}
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);
  activeModalEl = backdrop;
  previousBodyOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  document.getElementById('app')?.setAttribute('inert', '');

  // Fade in modal
  requestAnimationFrame(() => {
    backdrop.classList.add('is-visible');
  });

  const closeBtn = backdrop.querySelector('.modal-close-btn');
  closeBtn?.focus();

  const handleClose = () => {
    if (beforeClose && beforeClose() === false) return;
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
      return;
    }

    if (e.key === 'Tab') {
      const focusable = [...backdrop.querySelectorAll(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), video[controls], [tabindex]:not([tabindex="-1"])'
      )];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };
  document.addEventListener('keydown', escListener);

  return backdrop;
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

  document.body.style.overflow = previousBodyOverflow;
  document.getElementById('app')?.removeAttribute('inert');

  if (previouslyFocusedElement instanceof HTMLElement && previouslyFocusedElement.isConnected) {
    previouslyFocusedElement.focus();
  }
  previouslyFocusedElement = null;

  current.classList.remove('is-visible');
  setTimeout(() => {
    if (current.parentNode) {
      current.parentNode.removeChild(current);
    }
  }, 300);
}
