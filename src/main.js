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

// Apply persisted palette and reading scale before the application renders.
applySettings();

// Boot once the DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
