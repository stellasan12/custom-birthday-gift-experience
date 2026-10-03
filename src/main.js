/**
 * Entry point — Birthday Gift Experience
 *
 * Imports stylesheets and boots the application.
 * Vite processes these CSS imports and bundles them.
 */

import './styles/main.css';
import './styles/animations.css';
import './styles/responsive.css';
import './styles/gallery.css';
import './styles/increment5.css';

import { initApp } from './js/app.js';
import { applySettings } from './js/settings.js';
import { loadSiteContent } from './js/site-content.js';
import { setupGlobalButtonSounds } from './js/sound-effects.js';
import { requireBirthdayPin } from './js/login.js';

// Apply persisted palette and reading scale before the application renders.
applySettings();
setupGlobalButtonSounds();

async function boot() {
  const app = document.getElementById('app');
  if (!app) return;
  await requireBirthdayPin(app);
  if (app) app.innerHTML = '<div class="site-loading" role="status"><span>💌</span><p>Opening your birthday surprise...</p></div>';
  await loadSiteContent();
  initApp();
}

// Resolve remote creator content before rendering; the service always falls back.
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
