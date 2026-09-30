import { siteData } from '../data/content.js';
import { openLetter } from './letter-reader.js';

const FALLBACK = '/images/placeholders/default-sender.svg';
const esc = (value = '') => String(value).replace(/[&<>'"]/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[c]));

function preview(letter) {
  const text = (letter?.content || []).map((block) => block?.text || '').join(' ').replace(/\s+/g, ' ').trim();
  if (!text) return 'A little message is waiting here...';
  return text.length > 120 ? `${text.slice(0, 117).trimEnd()}...` : text;
}

export function renderLetterArchive(container, onBack) {
  const gifts = Array.isArray(siteData.gifts) ? siteData.gifts : [];
  container.innerHTML = `<main class="letter-archive fade-in"><header class="archive-header"><button class="archive-back">← Back to Gifts</button><div><p class="archive-eyebrow">saved with love</p><h1 class="font-heading">Letters for you 💌</h1><p>Little pieces of love from your favorite people.</p></div></header><section class="archive-stack">${gifts.length ? gifts.map((gift, index) => `<article class="archive-letter archive-letter-${index%3}"><div class="archive-stamp" aria-hidden="true">💌</div><img class="archive-sender-photo" src="${esc(gift.sender?.photo || FALLBACK)}" alt="Photo of ${esc(gift.sender?.name || 'Letter sender')}" data-sender-photo><div class="archive-copy"><p class="archive-from">A letter from</p><h2>${esc(gift.sender?.name || 'Someone who cares about you')}</h2><h3>${esc(gift.letter?.title || 'For you 💌')}</h3><p>${esc(preview(gift.letter))}</p></div><button class="archive-read" data-read-letter="${esc(gift.id)}">Read Letter <span aria-hidden="true">→</span></button></article>`).join('') : `<div class="archive-empty">${siteData.giftSource === 'supabase' ? 'A few surprises are still being wrapped... 💌' : "No letters yet... but there's always room for more love 💌"}</div>`}</section></main>`;
  container.querySelector('.archive-back')?.addEventListener('click', onBack);
  container.querySelectorAll('[data-read-letter]').forEach((button) => button.addEventListener('click', () => openLetter(button.dataset.readLetter)));
  container.querySelectorAll('[data-sender-photo]').forEach((img) => img.addEventListener('error', () => { if (!img.src.endsWith(FALLBACK)) img.src = FALLBACK; }, { once: true }));
}
