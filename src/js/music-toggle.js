import { getMuted, onStateChange, toggleMute } from './audio.js';

let unsubscribe = null;
let shortcutHintShown = false;

/** Mount one synchronized floating music control on the current application page. */
export function mountMusicToggle(container) {
  if (!container) return;

  unsubscribe?.();
  unsubscribe = null;

  let button = container.querySelector('[data-global-music-toggle], #audio-toggle, #audio-toggle-room');
  if (!button) {
    button = document.createElement('button');
    button.className = 'audio-toggle';
    button.type = 'button';
    container.append(button);
  }

  button.dataset.globalMusicToggle = '';
  const sync = (muted = getMuted()) => {
    if (!button.isConnected) return;
    button.textContent = muted ? '🔇' : '🔊';
    button.setAttribute('aria-label', muted ? 'Unmute background music' : 'Mute background music');
    button.setAttribute('aria-pressed', String(muted));
    button.title = `${muted ? 'Turn music on' : 'Mute music'} · Double-click anywhere to mute or unmute BG music`;
  };

  button.onclick = toggleMute;
  unsubscribe = onStateChange(sync);
  sync();

  if (!shortcutHintShown && !container.querySelector('#intro')) {
    shortcutHintShown = true;
    const hint = document.createElement('p');
    hint.className = 'music-shortcut-hint';
    hint.setAttribute('role', 'status');
    hint.textContent = 'Tip: Double-click anywhere to mute or unmute the BG music 🎵';
    container.append(hint);
    const dismiss = () => hint.classList.add('is-leaving');
    hint.addEventListener('click', dismiss, { once: true });
    window.setTimeout(dismiss, 6500);
    window.setTimeout(() => hint.remove(), 7100);
  }
}
