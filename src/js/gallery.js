import { siteData } from '../data/content.js';
import { getGalleryState, saveGalleryState, isPhotoFavorite, togglePhotoFavorite } from './storage.js';
import { NOTE_COLORS, addPhotoComment, editPhotoComment, deletePhotoComment, getPhotoComments } from './photo-comments.js';
import { burstHearts } from './effects.js';
import { openModal } from './modal.js';
import { isGlobalMusicPlaying, pauseGlobalMusic, playGlobalMusic, getMuted } from './audio.js';

const FALLBACK = '/images/gallery/memory-placeholder.svg';
const PROFILE_FAVORITE_ID = '__social-profile__';
let rememberedSocialSection = 'posts';
const esc = (value = '') => String(value).replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
const ordered = (items, ids = []) => [...items].sort((a, b) => (ids.indexOf(a.id) < 0 ? 9999 : ids.indexOf(a.id)) - (ids.indexOf(b.id) < 0 ? 9999 : ids.indexOf(b.id)));
const albums = () => {
  const source = siteData.gallery?.albums || [];
  if (siteData.gallerySource === 'supabase') return source;
  const state = getGalleryState();
  return ordered(source, state.albumOrder).map((album) => ({ ...album, photos: ordered(album.photos || [], state.photoOrder?.[album.id]) }));
};
const allPhotos = () => albums().flatMap((album) => (album.photos || []).map((photo) => ({ photo, album })));
const image = (photo, className, lazy = true) => `<img class="${className}" src="${esc(photo.src || FALLBACK)}" alt="${esc(photo.alt || 'Memory photo')}" ${lazy ? 'loading="lazy"' : ''} data-fallback-image>`;
const date = (value, style = 'medium') => value ? `<time datetime="${esc(value)}">${new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { dateStyle: style })}</time>` : '';

function installFallbacks(root) { root.querySelectorAll('[data-fallback-image]').forEach((img) => img.addEventListener('error', () => { if (!img.src.endsWith(FALLBACK)) { img.src = FALLBACK; img.alt = 'Memory photo unavailable'; } }, { once: true })); }
function heart(id, className = '') { const loved = isPhotoFavorite(id); return `<button class="favorite-button ${className} ${loved ? 'is-active' : ''}" data-favorite="${esc(id)}" aria-pressed="${loved}" aria-label="${loved ? 'Remove from favorites' : 'Add to favorites'}">${loved ? '♥' : '♡'}</button>`; }
function inlineComments(id) { return getPhotoComments(id).slice(0, 2).map((note) => `<p class="inline-note"><strong>you</strong> ${esc(note.text)}</p>`).join(''); }

export function renderGallery(container, onBack, onLetters) {
  let mode = getGalleryState().preferredView, albumId = null, carouselTimer, socialSection = rememberedSocialSection;
  let profileLoved = isPhotoFavorite(PROFILE_FAVORITE_ID);

  function albumHome() {
    const list = albums(), photos = allPhotos();
    if (!list.length) return '<div class="gallery-empty">The memories are still developing... 📷</div>';
    return `<section class="phone-albums"><div class="section-title-row"><div><p class="gallery-eyebrow">your little library</p><h2 class="section-script">Albums ♡</h2></div></div><div class="album-grid">${list.map((album) => `<button class="album-card" data-album="${esc(album.id)}"><span class="album-photo">${image({ src: album.coverImage, alt: `${album.title} album cover` }, 'album-cover')}</span><strong>${esc(album.title)}</strong><small>${album.photos.length} ${album.photos.length === 1 ? 'photo' : 'photos'}</small></button>`).join('')}</div></section>${photos.length ? `<section class="carousel-memories"><div class="carousel-heading"><div><p>recently remembered</p><h2 class="section-script">Little moments ♡</h2></div><div class="carousel-actions"><button data-view-all class="view-all">All memories</button><button data-carousel-prev aria-label="Previous memories">←</button><button data-carousel-next aria-label="Next memories">→</button></div></div><div class="memory-carousel-track" tabindex="0">${photos.map(({ photo, album }) => `<div class="carousel-memory"><button data-photo="${esc(photo.id)}" data-context="${esc(album.id)}">${image(photo, 'carousel-photo')}<span>${esc(photo.caption || album.title)}</span></button>${heart(photo.id)}</div>`).join('')}</div></section>` : ''}`;
  }

  function photoGrid(items, context) {
    return `<div class="photo-grid">${items.map(({ photo }) => `<div class="photo-tile"><button data-photo="${esc(photo.id)}" data-context="${esc(context)}">${image(photo, 'photo-thumb')}</button>${heart(photo.id, 'tile-heart')}</div>`).join('')}</div>`;
  }

  function galleryHTML() {
    if (!albumId) return albumHome();
    if (albumId === '__all') { const items = allPhotos(); return `<section class="album-page"><button data-back-albums class="album-back">← Albums</button><h2>All Memories ♡</h2><p>${items.length} ${items.length === 1 ? 'memory' : 'memories'}</p>${items.length ? photoGrid(items, '__all') : '<div class="gallery-empty">The memories are still developing... 📷</div>'}</section>`; }
    const album = albums().find((item) => item.id === albumId); if (!album) { albumId = null; return albumHome(); }
    const items = album.photos.map((photo) => ({ photo, album }));
    return `<section class="album-page"><button data-back-albums class="album-back">← Albums</button><h2>${esc(album.title)} ♡</h2><p>${album.photos.length} ${album.photos.length === 1 ? 'memory' : 'memories'}${album.description ? ` · ${esc(album.description)}` : ''}</p>${items.length ? photoGrid(items, album.id) : '<div class="gallery-empty">Nothing here yet — this memory box is waiting for something special.</div>'}</section>`;
  }

  function renderPost(photo, album) {
    const post = { id: photo.id, images: [photo], caption: photo.caption, date: photo.date, album };
    return `<article class="memory-post"><header><span class="post-avatar">${image({ src: album.coverImage, alt: '' }, '')}</span><div><strong>${esc(album.title)}</strong>${post.date ? date(post.date) : '<small>A memory</small>'}</div><span class="post-more" aria-hidden="true">•••</span></header><button class="post-media-button" data-photo="${esc(photo.id)}" data-context="${esc(album.id)}">${image(post.images[0], 'post-image')}</button><div class="post-actions">${heart(photo.id)}<button type="button" class="comment-glyph" data-photo="${esc(photo.id)}" data-context="${esc(album.id)}" aria-label="Open comments for this memory">○</button></div><div class="post-copy">${post.caption ? `<p>${esc(post.caption)}</p>` : ''}<div class="inline-notes">${inlineComments(photo.id)}</div>${getPhotoComments(photo.id).length > 2 ? `<button data-note-photo="${esc(photo.id)}" data-context="${esc(album.id)}">View all ${getPhotoComments(photo.id).length} memory notes</button>` : ''}</div><form class="inline-comment-form" data-inline-comment="${esc(photo.id)}"><label class="sr-only" for="comment-${esc(photo.id)}">Add a comment</label><input id="comment-${esc(photo.id)}" name="text" maxlength="500" required placeholder="Add a comment..."><button type="submit">Post</button></form></article>`;
  }

  function socialHTML() {
    const list = albums(), photos = allPhotos();
    if (!list.length) return '<div class="gallery-empty">The memories are still developing... 📷</div>';
    const empty = '<div class="gallery-empty">Photos will appear here when these memory boxes are filled.</div>';
    const introVideo = siteData.intro?.type === 'video' ? siteData.intro.video : '';
    const content = socialSection === 'posts'
      ? (photos.length ? `<div class="social-post-grid">${photos.map(({ photo, album }) => `<button data-photo="${esc(photo.id)}" data-context="${esc(album.id)}" aria-label="Open ${esc(photo.alt || 'memory')}">${image(photo, 'social-grid-image')}</button>`).join('')}</div>` : empty)
      : socialSection === 'reels'
        ? (introVideo ? `<div class="social-reels-grid"><button type="button" class="reel-tile" data-open-reel aria-label="Play birthday intro reel"><video src="${esc(introVideo)}" muted playsinline preload="metadata"></video><span class="reel-play" aria-hidden="true">▶</span><span class="reel-label">Birthday reel</span></button></div>` : '<div class="gallery-empty">Your birthday reel is still being prepared.</div>')
        : `<div class="social-feed">${photos.length ? photos.map(({ photo, album }) => renderPost(photo, album)).join('') : empty}</div>`;
    const followerCount = getFollowers().length;
    const profileImage = siteData.homepage?.characterImage || '/images/placeholders/birthday-character.svg';
    return `<section class="social-shell"><div class="social-profile"><div class="profile-mark"><img class="profile-image" src="${esc(profileImage)}" alt="Birthday site character"></div><div><h2>our.memories</h2><p>${photos.length} posts · ${list.length} highlights</p><span>A small corner for all our favorite days ✨</span></div></div><div class="profile-actions"><button type="button" data-followers>Followers (${followerCount})</button><button type="button" data-open-letters>Message</button><button type="button" class="profile-heart ${profileLoved ? 'is-active' : ''}" data-profile-heart aria-pressed="${profileLoved}" aria-label="${profileLoved ? 'Unlike this memory profile' : 'Like this memory profile'}">${profileLoved ? '♥' : '♡'}</button></div><div class="highlights" aria-label="Album highlights">${list.map((album) => `<button data-story="${esc(album.id)}"><span>${image({ src: album.coverImage, alt: '' }, 'highlight-image')}</span><strong>${esc(album.title)}</strong></button>`).join('')}</div><div class="social-tabs" role="tablist" aria-label="Post presentations"><button type="button" role="tab" data-social-section="posts" aria-selected="${socialSection === 'posts'}">▦ Posts</button><button type="button" role="tab" data-social-section="memories" aria-selected="${socialSection === 'memories'}">♡ Memories</button></div>${content}</section>`;
  }

  function render() {
    clearInterval(carouselTimer);
    container.innerHTML = `<div class="memory-gallery fade-in"><header class="gallery-header"><button class="gallery-back">← Back to Gifts</button><div><p class="gallery-eyebrow">a little collection of</p><h1 class="font-heading">${esc(siteData.gallery?.title || 'Our Memories')} ♡</h1></div><div class="gallery-toggle" role="group" aria-label="Gallery view"><button data-mode="gallery" aria-pressed="${mode === 'gallery'}">Gallery</button><button data-mode="social" aria-pressed="${mode === 'social'}">Social</button></div></header><main id="gallery-content">${mode === 'social' ? socialHTML() : galleryHTML()}</main></div>`;
    container.querySelector('.gallery-back').textContent = '← Back';
    container.querySelector('.album-back')?.replaceChildren(document.createTextNode('← Back'));
    const profileMark = container.querySelector('.profile-mark');
    if (profileMark) {
      profileMark.setAttribute('role', 'button');
      profileMark.setAttribute('tabindex', '0');
      profileMark.setAttribute('aria-label', 'View birthday character picture');
      profileMark.dataset.profileImage = '';
    }
    container.querySelector('[data-social-section="memories"]')?.insertAdjacentHTML('beforebegin', `<button type="button" role="tab" data-social-section="reels" aria-selected="${socialSection === 'reels'}">▷ Reels</button>`);
    container.querySelectorAll('[data-social-section]').forEach((button) => button.addEventListener('click', () => { rememberedSocialSection = button.dataset.socialSection; }));
    profileMark?.addEventListener('click', openProfileImage);
    profileMark?.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openProfileImage(); } });
    container.querySelector('[data-open-reel]')?.addEventListener('click', openIntroReplay);
    bind(); installFallbacks(container); startCarousel();
  }

  function contextItems(context) {
    if (context && context !== '__all') { const album = albums().find((item) => item.id === context); if (album) return album.photos.map((photo) => ({ photo, album })); }
    return allPhotos();
  }
  function openPhoto(id, context) { const items = contextItems(context), index = items.findIndex(({ photo }) => photo.id === id); if (index >= 0) openViewer('photo', index, items); }
  function openStory(id) { const album = albums().find((item) => item.id === id); if (album?.photos.length) openViewer('story', 0, album.photos.map((photo) => ({ photo, album }))); }

  function getFollowers() {
    const seen = new Set();
    return (siteData.gifts || []).map((gift) => gift.sender).filter((sender) => {
      const key = sender?.name?.trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function openFollowers() {
    const followers = getFollowers();
    const fallback = '/images/placeholders/default-sender.svg';
    const modal = openModal({
      title: 'Followers',
      modalClass: 'followers-modal',
      bodyHTML: `<div class="followers-list">${followers.length ? followers.map((sender) => `<article class="follower-row"><img src="${esc(sender.photo || fallback)}" alt="Photo of ${esc(sender.name)}" data-follower-photo><div><strong>${esc(sender.name)}</strong><span>Sent you a birthday letter 💌</span></div></article>`).join('') : '<p class="followers-empty">Your favorite people will appear here soon 💌</p>'}</div>`,
    });
    modal?.querySelectorAll('[data-follower-photo]').forEach((photo) => photo.addEventListener('error', () => { photo.src = fallback; }, { once: true }));
  }

  function openProfileImage() {
    const profileImage = siteData.homepage?.characterImage || '/images/placeholders/birthday-character.svg';
    const modal = openModal({
      title: 'Birthday character',
      modalClass: 'profile-picture-modal',
      bodyHTML: `<img class="profile-picture-large" src="${esc(profileImage)}" alt="Birthday site character" data-fallback-image>`,
    });
    if (modal) installFallbacks(modal);
  }

  function openIntroReplay() {
    const intro = siteData.intro || {}, prior = document.activeElement, overlay = document.createElement('div');
    let replayTimer = null, current = 0;
    let resumeBackgroundMusic = false;
    const slides = (intro.slides || []).map((slide, index) => typeof slide === 'string' ? { src: slide, alt: `Intro image ${index + 1}` } : { src: slide?.src, alt: slide?.alt || `Intro image ${index + 1}` }).filter((slide) => slide.src);
    const media = intro.type === 'video'
      ? `<video class="intro-replay-video" controls muted playsinline autoplay><source src="${esc(intro.video)}" type="video/mp4"></video>`
      : `<div class="intro-replay-slides">${slides.map((slide, index) => `<img class="intro-replay-slide ${index === 0 ? 'active' : ''}" src="${esc(slide.src)}" alt="${esc(slide.alt)}" data-replay-slide="${index}" data-fallback-image>`).join('')}</div><div class="intro-replay-dots">${slides.map((_, index) => `<span class="${index === 0 ? 'active' : ''}" data-replay-dot="${index}"></span>`).join('')}</div>`;
    if (intro.type === 'video' && isGlobalMusicPlaying()) {
      resumeBackgroundMusic = true;
      pauseGlobalMusic(true);
    }
    overlay.className = 'intro-replay-modal'; overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true'); overlay.setAttribute('aria-label', 'Replay birthday intro');
    overlay.innerHTML = `<div class="intro-replay-card"><button class="intro-replay-close" data-close-replay aria-label="Close intro replay">×</button>${media}</div>`;
    const close = () => { clearTimeout(replayTimer); document.removeEventListener('keydown', keys); overlay.querySelector('video')?.pause(); overlay.remove(); document.body.style.overflow = ''; container.removeAttribute('inert'); if (resumeBackgroundMusic && !getMuted()) playGlobalMusic(); prior?.focus?.(); };
    const keys = (event) => { if (event.key === 'Escape') close(); };
    overlay.querySelector('[data-close-replay]').onclick = close; overlay.onclick = (event) => { if (event.target === overlay) close(); };
    if (intro.type !== 'video' && slides.length > 1) { const advance = () => { current = (current + 1) % slides.length; overlay.querySelectorAll('[data-replay-slide]').forEach((item, index) => item.classList.toggle('active', index === current)); overlay.querySelectorAll('[data-replay-dot]').forEach((item, index) => item.classList.toggle('active', index === current)); replayTimer = setTimeout(advance, intro.slideDuration || 3000); }; replayTimer = setTimeout(advance, intro.slideDuration || 3000); }
    container.setAttribute('inert', ''); document.body.append(overlay); document.body.style.overflow = 'hidden'; document.addEventListener('keydown', keys); installFallbacks(overlay); overlay.querySelector('[data-close-replay]').focus();
    const reelVideo = overlay.querySelector('video');
    reelVideo?.addEventListener('play', () => {
      if (isGlobalMusicPlaying()) resumeBackgroundMusic = true;
      pauseGlobalMusic(true);
    });
  }

  function openViewer(kind, startIndex, items) {
    let index = startIndex; const prior = document.activeElement, overlay = document.createElement('div'); overlay.className = `memory-viewer ${kind === 'story' ? 'story-viewer' : ''}`; overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true');
    const close = () => { document.removeEventListener('keydown', keys); overlay.remove(); document.body.style.overflow = ''; container.removeAttribute('inert'); prior?.focus?.(); render(); };
    const draw = () => { const { photo, album } = items[index]; overlay.innerHTML = `<div class="viewer-panel">${kind === 'story' ? `<div class="story-progress">${items.map((_, i) => `<span class="${i <= index ? 'done' : ''}"></span>`).join('')}</div>` : ''}<header><div><small>${esc(album.title)}</small><h2>${kind === 'story' ? esc(album.title) : 'A memory ♡'}</h2></div><button data-close aria-label="Close viewer">×</button></header><div class="viewer-media">${image(photo, 'viewer-image', false)}<button data-prev class="viewer-arrow prev" aria-label="Previous photo">‹</button><button data-next class="viewer-arrow next" aria-label="Next photo">›</button></div><div class="viewer-details"><div class="viewer-caption-row"><div>${photo.caption ? `<p>${esc(photo.caption)}</p>` : ''}${date(photo.date, 'long')}</div>${heart(photo.id)}</div>${commentsHTML(photo.id)}</div></div>`; installFallbacks(overlay); overlay.querySelector('[data-close]').onclick = close; overlay.querySelector('[data-prev]').onclick = () => { index = (index - 1 + items.length) % items.length; draw(); }; overlay.querySelector('[data-next]').onclick = () => { index = (index + 1) % items.length; draw(); }; bindFavorites(overlay, draw); bindComments(overlay, photo.id, draw); };
    const keys = (event) => { if (event.key === 'Escape') close(); if (event.key === 'ArrowLeft') { index = (index - 1 + items.length) % items.length; draw(); } if (event.key === 'ArrowRight') { index = (index + 1) % items.length; draw(); } }; overlay.onclick = (event) => { if (event.target === overlay) close(); }; document.addEventListener('keydown', keys); container.setAttribute('inert', ''); document.body.append(overlay); document.body.style.overflow = 'hidden'; draw();
  }

  function bindFavorites(root, redraw = render) { root.querySelectorAll('[data-favorite]').forEach((button) => button.addEventListener('click', (event) => { event.stopPropagation(); burstHearts(button); togglePhotoFavorite(button.dataset.favorite); redraw(); })); }
  function bind() { container.querySelector('.gallery-back')?.addEventListener('click', onBack); container.querySelectorAll('[data-mode]').forEach((button) => button.addEventListener('click', () => { mode = button.dataset.mode; albumId = null; saveGalleryState({ preferredView: mode }); render(); })); container.querySelectorAll('[data-social-section]').forEach((button) => button.addEventListener('click', () => { socialSection = button.dataset.socialSection; render(); })); container.querySelector('[data-followers]')?.addEventListener('click', openFollowers); container.querySelector('[data-profile-heart]')?.addEventListener('click', (event) => { const button = event.currentTarget; burstHearts(button); profileLoved = togglePhotoFavorite(PROFILE_FAVORITE_ID); button.classList.toggle('is-active', profileLoved); button.textContent = profileLoved ? '♥' : '♡'; button.setAttribute('aria-pressed', String(profileLoved)); button.setAttribute('aria-label', profileLoved ? 'Unlike this memory profile' : 'Like this memory profile'); }); container.querySelector('.profile-image')?.addEventListener('error', (event) => { event.currentTarget.src = '/images/placeholders/birthday-character.svg'; }, { once: true }); container.querySelector('[data-open-letters]')?.addEventListener('click', () => onLetters?.()); container.querySelector('[data-back-albums]')?.addEventListener('click', () => { albumId = null; render(); }); container.querySelector('[data-view-all]')?.addEventListener('click', () => { albumId = '__all'; render(); }); container.querySelectorAll('[data-album]').forEach((button) => button.addEventListener('click', () => { albumId = button.dataset.album; render(); })); container.querySelectorAll('[data-photo]').forEach((button) => button.addEventListener('click', () => openPhoto(button.dataset.photo, button.dataset.context))); container.querySelectorAll('[data-story]').forEach((button) => button.addEventListener('click', () => openStory(button.dataset.story))); container.querySelectorAll('[data-note-photo]').forEach((button) => button.addEventListener('click', () => openPhoto(button.dataset.notePhoto, button.dataset.context))); container.querySelectorAll('[data-inline-comment]').forEach((form) => form.addEventListener('submit', (event) => { event.preventDefault(); const data = new FormData(form), scrollTop = window.scrollY; addPhotoComment(form.dataset.inlineComment, String(data.get('text')), 'pink'); render(); requestAnimationFrame(() => window.scrollTo({ top: scrollTop })); })); bindFavorites(container); const track = container.querySelector('.memory-carousel-track'); container.querySelector('[data-carousel-prev]')?.addEventListener('click', () => track?.scrollBy({ left: -300, behavior: 'smooth' })); container.querySelector('[data-carousel-next]')?.addEventListener('click', () => track?.scrollBy({ left: 300, behavior: 'smooth' })); }
  function startCarousel() { const track = container.querySelector('.memory-carousel-track'); if (!track || matchMedia('(prefers-reduced-motion: reduce)').matches) return; carouselTimer = setInterval(() => { const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 8; track.scrollTo({ left: atEnd ? 0 : track.scrollLeft + 278, behavior: 'smooth' }); }, 3500);['pointerenter', 'focusin', 'touchstart'].forEach((name) => track.addEventListener(name, () => clearInterval(carouselTimer), { once: true })); }
  render();
}

function commentsHTML(id) { const notes = getPhotoComments(id); return `<section class="memory-notes"><h3>Memory notes ♡</h3><div class="note-list">${notes.length ? notes.map((note) => `<article class="memory-note annotation-${esc(note.color)}"><p>${esc(note.text)}</p><div><button data-edit-note="${esc(note.id)}">Edit</button><button data-delete-note="${esc(note.id)}">Delete</button></div></article>`).join('') : '<p class="notes-empty">Be the first to leave a memory note ♡</p>'}</div><form data-note-form><label>Write a memory</label><textarea name="text" maxlength="500" required placeholder="I remember this... ♡"></textarea><fieldset><legend>Note color</legend>${NOTE_COLORS.map((color, i) => `<label class="note-color annotation-${color}"><input type="radio" name="color" value="${color}" ${i ? '' : 'checked'}><span>${color}</span></label>`).join('')}</fieldset><button class="note-save">Save note</button></form></section>`; }
function bindComments(root, id, redraw) { root.querySelector('[data-note-form]')?.addEventListener('submit', (event) => { event.preventDefault(); const data = new FormData(event.currentTarget); addPhotoComment(id, String(data.get('text')), String(data.get('color'))); redraw(); }); root.querySelectorAll('[data-delete-note]').forEach((button) => button.onclick = () => { deletePhotoComment(id, button.dataset.deleteNote); redraw(); }); root.querySelectorAll('[data-edit-note]').forEach((button) => button.onclick = () => { const note = getPhotoComments(id).find((item) => item.id === button.dataset.editNote), text = prompt('Edit your memory note:', note?.text || ''); if (text !== null) { editPhotoComment(id, button.dataset.editNote, text, note?.color); redraw(); } }); }
