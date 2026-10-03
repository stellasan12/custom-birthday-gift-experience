/**
 * Visual Effects — Birthday Gift Experience
 *
 * Confetti burst and petal shower effects.
 * Uses <canvas> elements for smooth performance.
 */

import { playSoundEffect } from './sound-effects.js';

/** Whether the user prefers reduced motion */
const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

/**
 * Launch a celebratory confetti burst.
 * Creates a temporary canvas, animates confetti, then cleans up.
 *
 * @param {object} [options]
 * @param {number} [options.particleCount=80] Number of confetti pieces
 * @param {number} [options.duration=3000]   Animation duration in ms
 */
export function burstConfetti({ particleCount = 80, duration = 3000 } = {}) {
  playSoundEffect('confetti');
  // Respect reduced motion preference
  if (prefersReducedMotion) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'confetti-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  const onResize = () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  };
  window.addEventListener('resize', onResize);

  const colors = [
    '#FFB5C5', // pink
    '#D8B4FE', // lavender
    '#FFE5A0', // yellow
    '#B5D8F7', // sky blue
    '#A8E6CF', // mint
    '#FFD0A0', // peach
    '#F4A0B5', // rose
  ];

  const shapes = ['rect', 'circle', 'strip'];

  const particles = Array.from({ length: particleCount }, () => {
    const angle = Math.random() * Math.PI - Math.PI / 2;
    const speed = 4 + Math.random() * 8;

    return {
      x: width / 2,
      y: height * 0.35,
      vx: Math.cos(angle) * speed * (1 + Math.random()),
      vy: Math.sin(angle) * speed - (3 + Math.random() * 4),
      width: 6 + Math.random() * 6,
      height: 4 + Math.random() * 10,
      color: colors[Math.floor(Math.random() * colors.length)],
      shape: shapes[Math.floor(Math.random() * shapes.length)],
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.15,
      gravity: 0.12 + Math.random() * 0.08,
      friction: 0.98 + Math.random() * 0.015,
      opacity: 1,
    };
  });

  const startTime = performance.now();

  function animate(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);

    ctx.clearRect(0, 0, width, height);
    let aliveCount = 0;

    for (const p of particles) {
      p.vy += p.gravity;
      p.vx *= p.friction;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotationSpeed;

      if (progress > 0.6) {
        p.opacity = Math.max(0, 1 - (progress - 0.6) / 0.4);
      }

      if (p.opacity <= 0 || p.y > height + 50) continue;
      aliveCount++;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;

      if (p.shape === 'rect') {
        ctx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height);
      } else if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, p.width / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-p.width / 2, -1, p.width, 3);
      }

      ctx.restore();
    }

    if (progress < 1 && aliveCount > 0) {
      requestAnimationFrame(animate);
    } else {
      window.removeEventListener('resize', onResize);
      canvas.remove();
    }
  }

  requestAnimationFrame(animate);
}

/**
 * Shower gentle falling flower petals across the screen.
 * @param {object} [options]
 * @param {number} [options.count=35]
 * @param {number} [options.duration=4000]
 * @param {'classic'|'garden'} [options.style='classic']
 */
export function showerPetals({ count = 35, duration = 4000, style = 'classic' } = {}) {
  playSoundEffect('petals');
  if (prefersReducedMotion) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'confetti-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  const onResize = () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  };
  window.addEventListener('resize', onResize);

  const petalColors = style === 'garden'
    ? ['#FFF4A8', '#FFFDF2', '#B9DFA7', '#C7B7EA', '#91C9E8']
    : ['#FFC0CB', '#FFB6C1', '#FF69B4', '#FFA07A', '#E6E6FA'];

  const petals = Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * -height,
    size: 8 + Math.random() * 8,
    speedY: 1.5 + Math.random() * 2,
    sway: Math.random() * Math.PI * 2,
    swaySpeed: 0.02 + Math.random() * 0.03,
    color: petalColors[Math.floor(Math.random() * petalColors.length)],
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 0.05,
    opacity: 0.9,
  }));

  const startTime = performance.now();

  function animate(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);

    ctx.clearRect(0, 0, width, height);
    let aliveCount = 0;

    for (const p of petals) {
      p.y += p.speedY;
      p.sway += p.swaySpeed;
      p.x += Math.sin(p.sway) * 1.5;
      p.rotation += p.rotationSpeed;

      if (progress > 0.7) {
        p.opacity = Math.max(0, 1 - (progress - 0.7) / 0.3);
      }

      if (p.opacity <= 0 || p.y > height + 20) continue;
      aliveCount++;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;

      if (style === 'garden') {
        // A tiny five-petal wildflower, visually distinct from the pink petals.
        for (let petal = 0; petal < 5; petal += 1) {
          ctx.save();
          ctx.rotate((Math.PI * 2 * petal) / 5);
          ctx.beginPath();
          ctx.ellipse(0, -p.size * .48, p.size * .28, p.size * .55, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        ctx.beginPath();
        ctx.fillStyle = '#E7A94A';
        ctx.arc(0, 0, p.size * .2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size / 2, p.size, Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    if (progress < 1 && aliveCount > 0) {
      requestAnimationFrame(animate);
    } else {
      window.removeEventListener('resize', onResize);
      canvas.remove();
    }
  }

  requestAnimationFrame(animate);
}

/** Throw a small spray of hearts from a favorite button. */
export function burstHearts(origin, { count = 11 } = {}) {
  playSoundEffect('heart');
  if (!(origin instanceof Element) || prefersReducedMotion) return;

  const rect = origin.getBoundingClientRect();
  const layer = document.createElement('div');
  layer.className = 'heart-burst-layer';
  layer.setAttribute('aria-hidden', 'true');
  layer.style.left = `${rect.left + rect.width / 2}px`;
  layer.style.top = `${rect.top + rect.height / 2}px`;

  for (let index = 0; index < count; index += 1) {
    const heart = document.createElement('span');
    const angle = (-155 + Math.random() * 130) * (Math.PI / 180);
    const distance = 54 + Math.random() * 75;
    heart.textContent = index % 3 ? '♥' : '♡';
    heart.style.setProperty('--heart-x', `${Math.cos(angle) * distance}px`);
    heart.style.setProperty('--heart-y', `${Math.sin(angle) * distance}px`);
    heart.style.setProperty('--heart-rotate', `${-35 + Math.random() * 70}deg`);
    heart.style.setProperty('--heart-delay', `${Math.random() * 90}ms`);
    heart.style.setProperty('--heart-scale', String(.72 + Math.random() * .72));
    layer.append(heart);
  }

  document.body.append(layer);
  window.setTimeout(() => layer.remove(), 1100);
}
