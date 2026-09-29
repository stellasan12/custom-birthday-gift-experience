import { siteData } from '../data/content.js';
import { getGalleryState, saveGalleryState } from './storage.js';
import { NOTE_COLORS, addPhotoComment, editPhotoComment, deletePhotoComment, getPhotoComments } from './photo-comments.js';

const FALLBACK = '/images/gallery/memory-placeholder.svg';
const esc = (value = '') => String(value).replace(/[&<>'"]/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[c]));
const ordered = (items, ids = []) => [...items].sort((a,b) => (ids.indexOf(a.id)<0?9999:ids.indexOf(a.id))-(ids.indexOf(b.id)<0?9999:ids.indexOf(b.id)));
const albums = () => {
  const state = getGalleryState();
  return ordered(siteData.gallery?.albums || [], state.albumOrder).map((album) => ({ ...album, photos: ordered(album.photos || [], state.photoOrder?.[album.id]) }));
};
const allPhotos = () => albums().flatMap((album) => album.photos.map((photo) => ({ photo, album })));
const image = (photo, className, lazy = true) => `<img class="${className}" src="${esc(photo.src)}" alt="${esc(photo.alt || 'Memory photo')}" ${lazy?'loading="lazy"':''} data-fallback-image>`;
const date = (value, style='medium') => value ? `<time datetime="${esc(value)}">${new Date(`${value}T00:00:00`).toLocaleDateString(undefined,{dateStyle:style})}</time>` : '';

function installFallbacks(root) {
  root.querySelectorAll('[data-fallback-image]').forEach((img) => img.addEventListener('error', () => { if (!img.src.endsWith(FALLBACK)) { img.src=FALLBACK; img.alt='Memory photo unavailable'; } }, {once:true}));
}

export function renderGallery(container, onBack) {
  let mode = getGalleryState().preferredView;
  let albumId = null;
  let managing = false;
  let carouselTimer;

  const sortButtons = (kind,id,index,length) => `<span class="sort-controls"><button data-move="-1" data-kind="${kind}" data-id="${esc(id)}" ${index===0?'disabled':''} aria-label="Move earlier">←</button><button data-move="1" data-kind="${kind}" data-id="${esc(id)}" ${index===length-1?'disabled':''} aria-label="Move later">→</button></span>`;
  const albumHome = () => {
    const photos=allPhotos();
    return `<section><div class="section-title-row"><h2 class="section-script">Our Albums ♡</h2><button data-manage class="manage-button">${managing?'Done sorting':'Manage order'}</button></div><p class="sort-hint">${managing?'Use the arrows to arrange your albums.':''}</p><div class="album-grid">${albums().map((album,i)=>`<div class="sortable-album"><button class="album-card album-tilt-${i%3}" data-album="${esc(album.id)}"><span class="album-photo">${image({src:album.coverImage,alt:`${album.title} album cover`},'album-cover')}</span><strong>${esc(album.title)}</strong><small>${album.photos.length} photos</small><span>${esc(album.description||'')}</span></button>${sortButtons('album',album.id,i,albums().length)}</div>`).join('')}</div></section>
    <section class="carousel-memories"><div class="carousel-heading"><div><p>scraps from our days</p><h2 class="section-script">Little moments ♡</h2></div><div class="carousel-actions"><button data-view-all class="view-all">View all</button><button data-carousel-prev aria-label="Previous memories">←</button><button data-carousel-next aria-label="Next memories">→</button></div></div><div class="memory-carousel-track" tabindex="0">${photos.map(({photo})=>`<button data-photo="${esc(photo.id)}">${image(photo,'carousel-photo')}<span>${esc(photo.caption)}</span></button>`).join('')}</div></section>`;
  };
  const galleryHTML = () => {
    if (!albums().length) return '<div class="gallery-empty">Memories are being developed... 📷♡</div>';
    if (!albumId) return albumHome();
    if (albumId==='__all') return `<section class="album-page"><button data-back-albums class="album-back">← Gallery</button><h2>All little moments ♡</h2><p>Every memory, together.</p><div class="photo-grid">${allPhotos().map(({photo})=>`<button data-photo="${esc(photo.id)}">${image(photo,'photo-thumb')}</button>`).join('')}</div></section>`;
    const album=albums().find((item)=>item.id===albumId); if (!album) return albumHome();
    return `<section class="album-page"><button data-back-albums class="album-back">← Albums</button><div class="section-title-row"><h2>${esc(album.title)} ♡</h2><button data-manage class="manage-button">${managing?'Done sorting':'Sort photos'}</button></div><p>${esc(album.description||'')}</p><div class="photo-grid">${album.photos.map((photo,i)=>`<div class="sortable-photo"><button data-photo="${esc(photo.id)}">${image(photo,'photo-thumb')}</button>${sortButtons('photo',photo.id,i,album.photos.length)}</div>`).join('')}</div></section>`;
  };
  const inlineComments = (id) => getPhotoComments(id).map((note)=>`<p class="inline-note"><strong>you</strong> ${esc(note.text)}</p>`).join('');
  const socialHTML = () => `<section class="social-shell"><div class="social-profile"><div class="profile-mark">♡</div><div><h2>our.memories</h2><p>${allPhotos().length} posts · ${albums().length} highlights</p><span>A small corner for all our favorite days ✨</span></div></div><div class="highlights">${albums().map((album)=>`<button data-story="${esc(album.id)}"><span>${image({src:album.coverImage,alt:''},'highlight-image')}</span><strong>${esc(album.title)}</strong></button>`).join('')}</div><div class="social-feed">${allPhotos().map(({photo,album})=>`<article class="memory-post"><header><span class="post-avatar">${image({src:album.coverImage,alt:''},'')}</span><div><strong>${esc(album.title)}</strong><small>our.memories</small></div><span class="post-more">•••</span></header><button class="post-media-button" data-photo="${esc(photo.id)}">${image(photo,'post-image')}</button><div class="post-actions"><button aria-label="Like">♡</button><button data-note-photo="${esc(photo.id)}" aria-label="Comment">○</button><button aria-label="Share">⌁</button><button class="save-post" aria-label="Save">▱</button></div><div class="post-copy"><p><strong>${esc(album.title)}</strong> ${esc(photo.caption)}</p><div class="inline-notes">${inlineComments(photo.id)}</div>${date(photo.date)}<button data-note-photo="${esc(photo.id)}">${getPhotoComments(photo.id).length?'Add another comment…':'Add a comment…'}</button></div></article>`).join('')}</div></section>`;

  function render() {
    clearInterval(carouselTimer);
    container.innerHTML=`<div class="memory-gallery fade-in ${managing?'is-managing':''}"><header class="gallery-header"><button class="gallery-back">← Back to Gifts</button><div><p class="gallery-eyebrow">a little collection of</p><h1 class="font-heading">${esc(siteData.gallery?.title||'Our Memories')} ♡</h1></div><div class="gallery-toggle"><button data-mode="gallery" aria-pressed="${mode==='gallery'}">Gallery</button><button data-mode="social" aria-pressed="${mode==='social'}">Social</button></div></header><main id="gallery-content">${mode==='social'?socialHTML():galleryHTML()}</main></div>`;
    bind(); installFallbacks(container); startCarousel();
  }
  function move(kind,id,direction) {
    const state=getGalleryState();
    if(kind==='album'){ const ids=albums().map(a=>a.id),from=ids.indexOf(id),to=from+direction;if(to>=0&&to<ids.length)[ids[from],ids[to]]=[ids[to],ids[from]];saveGalleryState({albumOrder:ids}); }
    else { const album=albums().find(a=>a.id===albumId);const ids=album.photos.map(p=>p.id),from=ids.indexOf(id),to=from+direction;if(to>=0&&to<ids.length)[ids[from],ids[to]]=[ids[to],ids[from]];saveGalleryState({photoOrder:{...state.photoOrder,[albumId]:ids}}); }
    render();
  }
  function bind() {
    container.querySelector('.gallery-back')?.addEventListener('click',onBack);
    container.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.mode;albumId=null;saveGalleryState({preferredView:mode});render();}));
    container.querySelector('[data-manage]')?.addEventListener('click',()=>{managing=!managing;render();});
    container.querySelector('[data-back-albums]')?.addEventListener('click',()=>{albumId=null;render();});
    container.querySelector('[data-view-all]')?.addEventListener('click',()=>{albumId='__all';render();});
    container.querySelectorAll('[data-album]').forEach(b=>b.addEventListener('click',()=>{if(!managing){albumId=b.dataset.album;render();}}));
    container.querySelectorAll('[data-move]').forEach(b=>b.addEventListener('click',(e)=>{e.stopPropagation();move(b.dataset.kind,b.dataset.id,Number(b.dataset.move));}));
    container.querySelectorAll('[data-photo]').forEach(b=>b.addEventListener('click',()=>openPhoto(b.dataset.photo)));
    container.querySelectorAll('[data-story]').forEach(b=>b.addEventListener('click',()=>openStory(b.dataset.story)));
    container.querySelectorAll('[data-note-photo]').forEach(b=>b.addEventListener('click',()=>openPhoto(b.dataset.notePhoto)));
    container.querySelectorAll('[aria-label="Like"],[aria-label="Save"]').forEach(b=>b.addEventListener('click',()=>{const active=b.getAttribute('aria-pressed')==='true';b.setAttribute('aria-pressed',String(!active));b.classList.toggle('is-active',!active);if(b.getAttribute('aria-label')==='Like')b.textContent=active?'♡':'♥';}));
    const track=container.querySelector('.memory-carousel-track');
    container.querySelector('[data-carousel-prev]')?.addEventListener('click',()=>track.scrollBy({left:-300,behavior:'smooth'}));container.querySelector('[data-carousel-next]')?.addEventListener('click',()=>track.scrollBy({left:300,behavior:'smooth'}));
  }
  function startCarousel(){const track=container.querySelector('.memory-carousel-track');if(!track||matchMedia('(prefers-reduced-motion: reduce)').matches)return;carouselTimer=setInterval(()=>{const atEnd=track.scrollLeft+track.clientWidth>=track.scrollWidth-8;track.scrollTo({left:atEnd?0:track.scrollLeft+278,behavior:'smooth'});},3500);['pointerenter','focusin','touchstart'].forEach(n=>track.addEventListener(n,()=>clearInterval(carouselTimer),{once:true}));}
  function openPhoto(id){const items=allPhotos(),i=items.findIndex(({photo})=>photo.id===id);if(i>=0)openViewer('photo',i,items);}
  function openStory(id){const album=albums().find(a=>a.id===id);if(album?.photos.length)openViewer('story',0,album.photos.map(photo=>({photo,album})));}
  function openViewer(kind,startIndex,items){let index=startIndex;const prior=document.activeElement,overlay=document.createElement('div');overlay.className=`memory-viewer ${kind==='story'?'story-viewer':''}`;overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');const close=()=>{document.removeEventListener('keydown',keys);overlay.remove();document.body.style.overflow='';container.removeAttribute('inert');prior?.focus?.();render();};const draw=()=>{const {photo,album}=items[index];overlay.innerHTML=`<div class="viewer-panel">${kind==='story'?`<div class="story-progress">${items.map((_,i)=>`<span class="${i<=index?'done':''}"></span>`).join('')}</div>`:''}<header><div><small>${esc(album.title)}</small><h2>${kind==='story'?esc(album.title):'A memory ♡'}</h2></div><button data-close>×</button></header><div class="viewer-media">${image(photo,'viewer-image',false)}<button data-prev class="viewer-arrow prev">‹</button><button data-next class="viewer-arrow next">›</button></div><div class="viewer-details"><p>${esc(photo.caption)}</p>${date(photo.date,'long')}${commentsHTML(photo.id)}</div></div>`;installFallbacks(overlay);overlay.querySelector('[data-close]').onclick=close;overlay.querySelector('[data-prev]').onclick=()=>{index=(index-1+items.length)%items.length;draw();};overlay.querySelector('[data-next]').onclick=()=>{index=(index+1)%items.length;draw();};bindComments(overlay,photo.id,draw);};const keys=(e)=>{if(e.key==='Escape')close();if(e.key==='ArrowLeft'){index=(index-1+items.length)%items.length;draw();}if(e.key==='ArrowRight'){index=(index+1)%items.length;draw();}};overlay.onclick=(e)=>{if(e.target===overlay)close();};document.addEventListener('keydown',keys);container.setAttribute('inert','');document.body.append(overlay);document.body.style.overflow='hidden';draw();}
  render();
}

function commentsHTML(id){const notes=getPhotoComments(id);return `<section class="memory-notes"><h3>Comments ♡</h3><div class="note-list">${notes.length?notes.map(n=>`<article class="memory-note annotation-${esc(n.color)}"><p>${esc(n.text)}</p><div><button data-edit-note="${esc(n.id)}">Edit</button><button data-delete-note="${esc(n.id)}">Delete</button></div></article>`).join(''):'<p class="notes-empty">Be the first to leave a comment ♡</p>'}</div><form data-note-form><label>Write a comment</label><textarea name="text" maxlength="500" required placeholder="Add a comment…"></textarea><fieldset><legend>Note color</legend>${NOTE_COLORS.map((c,i)=>`<label class="note-color annotation-${c}"><input type="radio" name="color" value="${c}" ${i?'':'checked'}><span>${c}</span></label>`).join('')}</fieldset><button class="note-save">Post</button></form></section>`;}
function bindComments(root,id,redraw){root.querySelector('[data-note-form]')?.addEventListener('submit',(e)=>{e.preventDefault();const d=new FormData(e.currentTarget);addPhotoComment(id,String(d.get('text')),String(d.get('color')));redraw();});root.querySelectorAll('[data-delete-note]').forEach(b=>b.onclick=()=>{deletePhotoComment(id,b.dataset.deleteNote);redraw();});root.querySelectorAll('[data-edit-note]').forEach(b=>b.onclick=()=>{const n=getPhotoComments(id).find(x=>x.id===b.dataset.editNote),text=prompt('Edit your comment:',n?.text||'');if(text!==null){editPhotoComment(id,b.dataset.editNote,text,n?.color);redraw();}});}
