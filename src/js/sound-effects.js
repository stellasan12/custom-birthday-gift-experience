let context = null;
let globalButtonsReady = false;
const BUTTON_EFFECT_VOLUME = 0.20;

const buttonClickAudio = new Audio('/audio/effects/button-click.mp3');
buttonClickAudio.preload = 'auto';

function audioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  context ||= new AudioContextClass();
  if (context.state === 'suspended') context.resume().catch(() => { });
  return context;
}

function tone(ctx, { frequency, endFrequency = frequency, start, duration, gain = 0.12, type = 'sine' }) {
  const oscillator = ctx.createOscillator();
  const volume = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), start + duration);
  volume.gain.setValueAtTime(0.0001, start);
  volume.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), start + 0.02);
  volume.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(volume).connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function noise(ctx, start, duration, gain = 0.06) {
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < data.length; index += 1) data[index] = (Math.random() * 2 - 1) * (1 - index / data.length);
  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const volume = ctx.createGain();
  source.buffer = buffer;
  filter.type = 'highpass';
  filter.frequency.value = 900;
  volume.gain.setValueAtTime(gain, start);
  volume.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  source.connect(filter).connect(volume).connect(ctx.destination);
  source.start(start);
}

export function playSoundEffect(name) {
  const ctx = audioContext();
  if (!ctx) return;
  const now = ctx.currentTime + 0.01;

  if (name === 'confetti') {
    noise(ctx, now, 0.28, 0.055);
    tone(ctx, { frequency: 440, endFrequency: 880, start: now, duration: 0.2, gain: 0.08, type: 'triangle' });
    tone(ctx, { frequency: 660, endFrequency: 1100, start: now + 0.08, duration: 0.24, gain: 0.07, type: 'sine' });
  } else if (name === 'petals') {
    [740, 880, 1110].forEach((frequency, index) => tone(ctx, { frequency, start: now + index * 0.07, duration: 0.25, gain: 0.045 }));
  } else if (name === 'unlock') {
    [392, 523, 659].forEach((frequency, index) => tone(ctx, { frequency, start: now + index * 0.08, duration: 0.32, gain: 0.07, type: 'triangle' }));
  } else if (name === 'locked') {
    tone(ctx, { frequency: 170, endFrequency: 125, start: now, duration: 0.16, gain: 0.055, type: 'square' });
  } else if (name === 'heart') {
    tone(ctx, { frequency: 660, endFrequency: 780, start: now, duration: 0.18, gain: 0.07, type: 'sine' });
    tone(ctx, { frequency: 880, endFrequency: 1040, start: now + 0.08, duration: 0.24, gain: 0.065, type: 'triangle' });
  } else if (name === 'click') {
    buttonClickAudio.pause();
    buttonClickAudio.currentTime = 0;
    buttonClickAudio.volume = BUTTON_EFFECT_VOLUME;
    buttonClickAudio.play().catch(() => { });
  }
}

export function setupGlobalButtonSounds() {
  if (globalButtonsReady) return;
  globalButtonsReady = true;
  document.addEventListener('click', (event) => {
    const button = event.target instanceof Element ? event.target.closest('button') : null;
    if (!button || button.disabled || button.getAttribute('aria-disabled') === 'true') return;
    if (button.matches('[data-favorite], [data-profile-heart]')) return;
    playSoundEffect('click');
  });
}
