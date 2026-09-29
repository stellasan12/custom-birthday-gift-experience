/**
 * Visual Effects — Birthday Gift Experience
 *
 * Confetti burst and any future celebratory effects.
 * Uses a <canvas> element for performance.
 */

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
  // Respect reduced motion preference
  if (prefersReducedMotion) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'confetti-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  // Resize handler for during the animation
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

  // Create particles that burst from centre-top, fanning outward
  const particles = Array.from({ length: particleCount }, () => {
    const angle = (Math.random() * Math.PI) - (Math.PI / 2); // -90° to +90°
    const speed = 4 + Math.random() * 8;

    return {
      x: width / 2,
      y: height * 0.35,
      vx: Math.cos(angle) * speed * (1 + Math.random()),
      vy: Math.sin(angle) * speed - (3 + Math.random() * 4), // upward bias
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
      // Physics
      p.vy += p.gravity;
      p.vx *= p.friction;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotationSpeed;

      // Fade out during the last 40% of the animation
      if (progress > 0.6) {
        p.opacity = Math.max(0, 1 - ((progress - 0.6) / 0.4));
      }

      // Skip if invisible or off-screen
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
        // Strip / ribbon
        ctx.fillRect(-p.width / 2, -1, p.width, 3);
      }

      ctx.restore();
    }

    if (progress < 1 && aliveCount > 0) {
      requestAnimationFrame(animate);
    } else {
      // Cleanup
      window.removeEventListener('resize', onResize);
      canvas.remove();
    }
  }

  requestAnimationFrame(animate);
}
