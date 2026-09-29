import { siteData } from '../data/content.js';
import { getGalleryState, saveGalleryState } from './storage.js';
import { NOTE_COLORS, addPhotoComment, editPhotoComment, deletePhotoComment, getPhotoComments } from './photo-comments.js';

const FALLBACK = '/images/gallery/memory-placeholder.svg';
let keyHandler = null;

const esc = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
const albums = () => Array.isArray(siteData.gallery?.albums) ? siteData.gallery.albums : [];
const allPhotos = () => albums().flatMap((album) => (album.photos || []).map((photo) => ({ photo, album })));
const image = (photo, className, lazy = true) => `<img class="${className}" src="${esc(photo.src)}" alt="${esc(photo.alt || 'Memory photo')}" ${lazy ? 'loading="lazy"' : ''} data-fallback-image />`;

function installFallbacks(root) {
  root.querySelectorAll('[data-fallback-image]').forEach((img) => img.addEventListener('error', () => {
    if (img.src.endsWith(FALLBACK)) return;
    img.src = FALLBACK;
    img.alt = 'Memory photo unavailable';
  }, { once: true }));
}

function validatePhotoIds() {
  const seen = new Set();
  allPhotos().forEach(({ photo }) => {
    if (!photo.id || seen.has(photo.id)) console.warn(`[Gallery] Photo IDs must be unique: ${photo.id || '(missing)'}`);
    seen.add(photo.id);
  });
}

export function renderGallery(container, onBack) {
  validatePhotoIds();
  let mode = getGalleryState().preferredView;
  let albumId = null;

  const render = () => {
    container.innerHTML = `<div class="memory-gallery fade-in">
      <header class="gallery-header">
        <button class="gallery-back" type="button">← Back to Gifts</button>
        <div><p class="gallery-eyebrow">a little collection of</p><h1 class="font-heading">${esc(siteData.gallery?.title || 'Our Memories')} ♡</h1></div>
        <div class="gallery-toggle" role="group" aria-label="Gallery presentation">
          <button type="button" data-mode="gallery" aria-pressed="${mode === 'gallery'}">Gallery</button>
          <button type="button" data-mode="social" aria-pressed="${mode === 'social'}">Social</button>
        </div>
      </header><main id="gallery-content">${mode === 'social' ? socialHTML() : galleryHTML(albumId)}</main>
    </div>`;
    bind(); installFallbacks(container);
  };

  const bind = () => {
    container.querySelector('.gallery-back')?.addEventListener('click', onBack);
    container.querySelectorAll('[data-mode]').forEach((button) => button.addEventListener('click', () => {
      mode = button.dataset.mode; albumId = null; saveGalleryState({ preferredView: mode }); render();
    }));
    container.querySelector('[data-back-albums]')?.addEventListener('click', () => { albumId = null; render(); });
    container.querySelectorAll('[data-album]').forEach((button) => button.addEventListener('click', () => { albumId = button.dataset.album; render(); }));
    container.querySelectorAll('[data-photo]').forEach((button) => button.addEventListener('click', () => openPhoto(button.dataset.photo)));
    container.querySelectorAll('[data-story]').forEach((button) => button.addEventListener('click', () => openStory(button.dataset.story, 0)));
    container.querySelectorAll('[data-note-photo]').forEach((button) => button.addEventListener('click', () => openPhoto(button.dataset.notePhoto)));
    const track = container.querySelector('.memory-carousel-track');
    container.querySelector('[data-carousel-prev]')?.addEventListener('click', () => track?.scrollBy({ left: -300, behavior: 'smooth' }));
    container.querySelector('[data-carousel-next]')?.addEventListener('click', () => track?.scrollBy({ left: 300, behavior: 'smooth' }));
    track?.addEventListener('keydown', (e) => { if (['ArrowLeft','ArrowRight'].includes(e.key)) track.scrollBy({ left: e.key === 'ArrowLeft' ? -300 : 300, behavior: 'smooth' }); });
  };

  const galleryHTML = (selectedId) => {
    if (!albums().length) return '<div class="gallery-empty">Memories are being developed... 📷♡</div>';
    const selected = albums().find((item) => item.id === selectedId);
    if (selected) return `<section class="album-page"><button data-back-albums class="album-back">← Albums</button><h2>${esc(selected.title)} ♡</h2><p>${esc(selected.description || '')}</p>${selected.photos?.length ? `<div class="photo-grid">${selected.photos.map(({ id, ...photo }) => `<button data-photo="${esc(id)}" aria-label="Open ${esc(photo.alt)}">${image({ id, ...photo }, 'photo-thumb')}</button>`).join('')}</div>` : '<div class="gallery-empty">This album is waiting for its first memory.</div>'}</section>`;
    const photos = allPhotos();
    return `<section><h2 class="section-script">Our Albums ♡</h2><div class="album-grid">${albums().map((album, i) => `<button class="album-card album-tilt-${i % 3}" data-album="${esc(album.id)}"><span class="album-photo">${image({ src: album.coverImage, alt: `${album.title} album cover` }, 'album-cover')}</span><strong>${esc(album.title)}</strong><small>${album.photos?.length || 0} photos</small><span>${esc(album.description || '')}</span></button>`).join('')}</div></section>
      <section class="carousel-memories"><div class="carousel-heading"><div><p>scraps from our days</p><h2 class="section-script">Little moments ♡</h2></div><div><button data-carousel-prev aria-label="Previous memories">←</button><button data-carousel-next aria-label="Next memories">→</button></div></div><div class="memory-carousel-track" tabindex="0">${photos.map(({ photo }) => `<button data-photo="${esc(photo.id)}">${image(photo, 'carousel-photo')}<span>${esc(photo.caption)}</span></button>`).join('')}</div></section>`;
  };

  const socialHTML = () => albums().length ? `<section class="social-shell"><div class="highlights" aria-label="Album highlights">${albums().map((album) => `<button data-story="${esc(album.id)}"><span>${image({ src: album.coverImage, alt: '' }, 'highlight-image')}</span><strong>${esc(album.title)}</strong></button>`).join('')}</div><div class="social-feed">${allPhotos().map(({ photo, album }) => `<article class="memory-post"><header><span class="post-avatar">${image({ src: album.coverImage, alt: '' }, '')}</span><strong>${esc(album.title)}</strong></header>${image(photo, 'post-image')}<div class="post-copy"><p><strong>${esc(album.title)}</strong> ${esc(photo.caption)}</p>${photo.date ? `<time datetime="${esc(photo.date)}">${new Date(`${photo.date}T00:00:00`).toLocaleDateString(undefined, { dateStyle: 'medium' })}</time>` : ''}<button data-note-photo="${esc(photo.id)}">♡ ${getPhotoComments(photo.id).length ? `View ${getPhotoComments(photo.id).length} memory note${getPhotoComments(photo.id).length === 1 ? '' : 's'}` : 'Leave a memory note'}</button></div></article>`).join('')}</div></section>` : '<div class="gallery-empty">Memories are being developed... 📷♡</div>';

  const openPhoto = (photoId) => {
    const photos = allPhotos(); const index = photos.findIndex(({ photo }) => photo.id === photoId);
    if (index < 0) return;
    openViewer('photo', photos[index].album.id, index, photos);
  };
  const openStory = (albumId, index) => {
    const album = albums().find((item) => item.id === albumId); if (!album?.photos?.length) return;
    openViewer('story', albumId, index, album.photos.map((photo) => ({ photo, album })));
  };

  const openViewer = (kind, albumId, startIndex, items) => {
    let index = startIndex; const priorFocus = document.activeElement; const app = container;
    const overlay = document.createElement('div'); overlay.className = `memory-viewer ${kind === 'story' ? 'story-viewer' : ''}`; overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true');
    const close = () => { document.removeEventListener('keydown', keyHandler); overlay.remove(); document.body.style.overflow = ''; app.removeAttribute('inert'); priorFocus?.focus?.(); render(); };
    const draw = () => {
      const { photo, album } = items[index];
      overlay.innerHTML = `<div class="viewer-panel">${kind === 'story' ? `<div class="story-progress">${items.map((_, i) => `<span class="${i <= index ? 'done' : ''}"></span>`).join('')}</div>` : ''}<header><div><small>${esc(album.title)}</small><h2>${kind === 'story' ? esc(album.title) : 'A memory ♡'}</h2></div><button data-close aria-label="Close viewer">×</button></header><div class="viewer-media">${image(photo, 'viewer-image', false)}<button data-prev class="viewer-arrow prev" aria-label="Previous photo">‹</button><button data-next class="viewer-arrow next" aria-label="Next photo">›</button></div><div class="viewer-details"><p>${esc(photo.caption)}</p>${photo.date ? `<time datetime="${esc(photo.date)}">${new Date(`${photo.date}T00:00:00`).toLocaleDateString(undefined, { dateStyle: 'long' })}</time>` : ''}${commentsHTML(photo.id)}</div></div>`;
      installFallbacks(overlay);
      overlay.querySelector('[data-close]').addEventListener('click', close);
      overlay.querySelector('[data-prev]').addEventListener('click', () => { index = (index - 1 + items.length) % items.length; draw(); });
      overlay.querySelector('[data-next]').addEventListener('click', () => { index = (index + 1) % items.length; draw(); });
      bindComments(overlay, photo.id, draw);
      overlay.querySelector('[data-close]').focus();
    };
    keyHandler = (e) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') { index = (index - 1 + items.length) % items.length; draw(); }
      if (e.key === 'ArrowRight') { index = (index + 1) % items.length; draw(); }
      if (e.key === 'Tab') {
        const focusable = [...overlay.querySelectorAll('button, textarea, input:not([type="radio"]), [tabindex]:not([tabindex="-1"])')].filter((el) => !el.disabled);
        if (!focusable.length) return;
        const first = focusable[0]; const last = focusable.at(-1);
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', keyHandler); app.setAttribute('inert', ''); document.body.appendChild(overlay); document.body.style.overflow = 'hidden'; draw();
  };
  render();
}

function commentsHTML(photoId) {
  const notes = getPhotoComments(photoId);
  return `<section class="memory-notes"><h3>Your memory notes ♡</h3><div class="note-list">${notes.length ? notes.map((note) => `<article class="memory-note annotation-${esc(note.color)}"><p>${esc(note.text)}</p><div><button data-edit-note="${esc(note.id)}">Edit</button><button data-delete-note="${esc(note.id)}">Delete</button></div></article>`).join('') : '<p class="notes-empty">Leave a little note for this memory ♡</p>'}</div><form data-note-form><label for="note-${esc(photoId)}">Write a memory</label><textarea id="note-${esc(photoId)}" name="text" maxlength="500" required placeholder="I remember this... ♡"></textarea><fieldset><legend>Note color</legend>${NOTE_COLORS.map((color, i) => `<label class="note-color annotation-${color}"><input type="radio" name="color" value="${color}" ${i ? '' : 'checked'}><span>${color}</span></label>`).join('')}</fieldset><button class="note-save" type="submit">Save note</button></form></section>`;
}

function bindComments(root, photoId, redraw) {
  root.querySelector('[data-note-form]')?.addEventListener('submit', (e) => { e.preventDefault(); const data = new FormData(e.currentTarget); addPhotoComment(photoId, String(data.get('text')), String(data.get('color'))); redraw(); });
  root.querySelectorAll('[data-delete-note]').forEach((button) => button.addEventListener('click', () => { deletePhotoComment(photoId, button.dataset.deleteNote); redraw(); }));
  root.querySelectorAll('[data-edit-note]').forEach((button) => button.addEventListener('click', () => { const note = getPhotoComments(photoId).find((item) => item.id === button.dataset.editNote); const text = window.prompt('Edit your memory note:', note?.text || ''); if (text !== null) { editPhotoComment(photoId, button.dataset.editNote, text, note?.color); redraw(); } }));
}
