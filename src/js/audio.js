/**
 * Audio Manager — Birthday Gift Experience
 *
 * Centralized audio controller. Handles global background music
 * with proper browser autoplay policy compliance.
 *
 * Interaction flow:
 * 1. First click/tap/key anywhere → music fades in, listeners removed.
 * 2. After that, ONLY the audio toggle button controls mute/unmute.
 * 3. All play/pause transitions use smooth fade in/out.
 */

import { siteData } from '../data/content.js';

/** @type {HTMLAudioElement | null} */
let bgmElement = null;

/** Whether the user has interacted with the page at least once */
let hasUserInteracted = false;

/** Whether BGM playback has been requested by the app */
let bgmRequested = false;

/** Whether the user has explicitly muted via the toggle button */
let isMuted = false;

/** Current target volume (0–1) */
let targetVolume = siteData.audio.defaultVolume ?? 0.4;

/** Duration for fade transitions in ms */
const FADE_DURATION = 800;

/** Active fade interval reference */
let fadeInterval = null;

/** Callback for UI updates when mute/play state changes */
let onStateChangeCallback = null;

// ── Interaction listener references (for cleanup) ──
let interactionHandler = null;

/**
 * Initialise the audio system.
 * Creates the <audio> element but does NOT attempt playback.
 * Sets up "first interaction" listeners.
 */
export function initAudio() {
  if (bgmElement) return;

  const src = siteData.audio.globalBackgroundMusic;
  if (!src) return;

  bgmElement = new Audio();
  bgmElement.loop = true;
  bgmElement.volume = 0; // start silent — will fade in
  bgmElement.preload = 'auto';

  // Gracefully handle missing file
  bgmElement.addEventListener('error', () => {
    bgmElement = null;
  }, { once: true });

  bgmElement.src = src;

  // Listen for the FIRST user interaction anywhere on the page.
  // Once triggered: start music, update UI, and stop listening.
  interactionHandler = () => {
    hasUserInteracted = true;

    if (bgmRequested && !isMuted) {
      fadeIn();
    }

    // Remove listeners — further clicks should NOT affect audio
    removeInteractionListeners();
  };

  document.addEventListener('click', interactionHandler, { capture: true, passive: true });
  document.addEventListener('keydown', interactionHandler, { capture: true, passive: true });
  document.addEventListener('touchstart', interactionHandler, { capture: true, passive: true });

  // Throughout the system, double-clicking toggles BGM play/pause
  document.addEventListener('dblclick', () => {
    if (!hasUserInteracted) {
      hasUserInteracted = true;
      removeInteractionListeners();
    }
    toggleMute();
  });
}

function removeInteractionListeners() {
  if (!interactionHandler) return;
  document.removeEventListener('click', interactionHandler, true);
  document.removeEventListener('keydown', interactionHandler, true);
  document.removeEventListener('touchstart', interactionHandler, true);
  interactionHandler = null;
}

// ═════════════════════════════════════════════════
//  FADE IN / FADE OUT
// ═════════════════════════════════════════════════

/**
 * Fade the music in from silence to target volume.
 */
function fadeIn() {
  if (!bgmElement) return;

  // Cancel any ongoing fade
  clearFade();

  bgmElement.volume = 0;
  const promise = bgmElement.play();
  if (promise && typeof promise.catch === 'function') {
    promise.catch(() => {
      // Autoplay still blocked — nothing we can do
    });
  }

  const steps = 20;
  const stepTime = FADE_DURATION / steps;
  let currentStep = 0;

  fadeInterval = setInterval(() => {
    currentStep++;
    const progress = currentStep / steps;
    // Ease-out curve for natural fade in
    bgmElement.volume = targetVolume * (1 - Math.pow(1 - progress, 2));

    if (currentStep >= steps) {
      bgmElement.volume = targetVolume;
      clearFade();
    }
  }, stepTime);

  // Notify UI that music is now playing
  if (onStateChangeCallback) onStateChangeCallback(false);
}

/**
 * Fade the music out from current volume to silence, then pause.
 */
function fadeOut() {
  if (!bgmElement || bgmElement.paused) return;

  clearFade();

  const startVolume = bgmElement.volume;
  const steps = 20;
  const stepTime = FADE_DURATION / steps;
  let currentStep = 0;

  fadeInterval = setInterval(() => {
    currentStep++;
    const progress = currentStep / steps;
    // Ease-in curve for natural fade out
    bgmElement.volume = startVolume * (1 - progress * progress);

    if (currentStep >= steps) {
      bgmElement.volume = 0;
      bgmElement.pause();
      clearFade();
    }
  }, stepTime);
}

function clearFade() {
  if (fadeInterval) {
    clearInterval(fadeInterval);
    fadeInterval = null;
  }
}

// ═════════════════════════════════════════════════
//  PUBLIC API
// ═════════════════════════════════════════════════

/**
 * Request global background music playback.
 * Music will start on first user interaction.
 */
export function playGlobalMusic() {
  bgmRequested = true;
  if (hasUserInteracted && !isMuted) {
    fadeIn();
  }
}

/**
 * Pause global background music.
 * @param {boolean} [immediate=false] Skip the fade when another media source is starting.
 */
export function pauseGlobalMusic(immediate = false) {
  bgmRequested = false;
  if (immediate && bgmElement) {
    clearFade();
    bgmElement.pause();
    bgmElement.volume = 0;
  } else {
    fadeOut();
  }
}

/**
 * Set volume (0–1). Adjusts live playback if playing.
 * @param {number} val
 */
export function setVolume(val) {
  targetVolume = Math.max(0, Math.min(1, val));
  // Only set directly if not mid-fade
  if (!fadeInterval && bgmElement && !bgmElement.paused) {
    bgmElement.volume = targetVolume;
  }
}

/**
 * Set muted state — called by the audio toggle button.
 * Fades out to mute, fades in to unmute.
 * @param {boolean} muted
 */
export function setMuted(muted) {
  isMuted = muted;

  if (!bgmElement) return;

  if (muted) {
    fadeOut();
  } else if (bgmRequested && hasUserInteracted) {
    fadeIn();
  }

  if (onStateChangeCallback) onStateChangeCallback(isMuted);
}

/**
 * Toggle mute on/off. Returns new muted state.
 * @returns {boolean}
 */
export function toggleMute() {
  setMuted(!isMuted);
  return isMuted;
}

/**
 * @returns {boolean} Current muted state
 */
export function getMuted() {
  return isMuted;
}

/**
 * Whether the global track is currently producing (or fading toward) audio.
 * Used by media overlays so they only resume music that was actually playing.
 */
export function isGlobalMusicPlaying() {
  return Boolean(bgmElement && !bgmElement.paused && !isMuted && bgmRequested);
}

/**
 * Register a callback for state changes (muted/unmuted).
 * @param {(muted: boolean) => void} cb
 */
export function onStateChange(cb) {
  onStateChangeCallback = cb;
}
