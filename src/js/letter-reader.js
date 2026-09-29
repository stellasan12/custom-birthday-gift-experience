/** Reusable Letter Reader. Open from any future surface with openLetter(giftId). */

import { siteData } from '../data/content.js';
import { openModal } from './modal.js';
import { startLetterMusic, stopLetterMusic } from './audio.js';
import { getGiftAnnotations, saveGiftAnnotations } from './storage.js';
import {
  ANNOTATION_COLORS,
  createAnnotation,
  getRenderableAnnotations,
  rangesOverlap,
  selectionToAnchor,
} from './annotations.js';

const DEFAULT_SENDER = '/images/placeholders/default-sender.svg';
let activeCleanup = null;

export function openLetter(giftId) {
  const gift = siteData.gifts?.find((item) => item.id === giftId);
  if (!gift) return false;

  activeCleanup?.();

  let records = getGiftAnnotations(gift.id);
  let pendingAnchor = null;
  let editingId = null;
  let composerDirty = false;
  let selectionTimer = null;
  const blocks = Array.isArray(gift.letter?.content) ? gift.letter.content : [];

  const modal = openModal({
    title: 'A letter for you 💌',
    modalClass: 'letter-reader-modal',
    bodyHTML: `
      <div class="letter-opening" aria-hidden="true"><span>💌</span></div>
      <article class="letter-paper" aria-label="Birthday letter">
        <div class="letter-tape letter-tape--left" aria-hidden="true"></div>
        <div class="letter-tape letter-tape--right" aria-hidden="true"></div>
        <header class="letter-sender">
          <div class="sender-polaroid"><img class="letter-sender-photo" alt=""></div>
          <div><span class="letter-from-label">A letter from</span><strong class="letter-sender-name"></strong></div>
        </header>
        <h2 class="letter-heading font-heading"></h2>
        <div class="letter-body" aria-label="Letter content"></div>
        <p class="letter-empty" hidden>This little letter is waiting for its words 💌</p>
        <p class="letter-signoff"></p>
        <div class="letter-doodle" aria-hidden="true">♡ ✦ ♫</div>
        <section class="letter-music" aria-label="Letter music controls">
          <span class="letter-music-note" aria-hidden="true">♪</span>
          <span class="letter-music-label">Letter music</span>
          <button type="button" class="letter-music-play" aria-label="Play letter music">▶</button>
          <button type="button" class="letter-music-mute" aria-label="Mute letter music">🔊</button>
          <label class="letter-volume-label">Volume
            <input class="letter-volume" type="range" min="0" max="1" step="0.05" value="0.45" aria-label="Letter music volume">
          </label>
          <span class="letter-music-status" role="status"></span>
        </section>
      </article>
      <div class="selection-toolbar" hidden><button type="button">💬 React</button></div>
      <section class="reaction-composer" hidden aria-label="Reaction editor">
        <h3>Leave a little note 💌</h3>
        <p>Reacting to: <q class="reaction-selection-preview"></q></p>
        <label>Your reaction<textarea class="reaction-input" rows="3" maxlength="500" placeholder="Write what this made you feel..."></textarea></label>
        <fieldset class="reaction-colors"><legend>Ink color</legend></fieldset>
        <p class="reaction-composer-error" role="alert"></p>
        <div class="reaction-composer-actions">
          <button type="button" class="reaction-cancel">Cancel</button>
          <button type="button" class="reaction-save">Save 💌</button>
        </div>
      </section>
      <p class="letter-reader-status" role="status" aria-live="polite"></p>
    `,
    beforeClose: () => !composerDirty || window.confirm('You have an unfinished reaction. Close anyway?'),
    onClose: cleanup,
  });

  if (!modal) return false;
  const body = modal.querySelector('.letter-body');
  const composer = modal.querySelector('.reaction-composer');
  const toolbar = modal.querySelector('.selection-toolbar');
  const input = modal.querySelector('.reaction-input');
  const status = modal.querySelector('.letter-reader-status');
  const preview = modal.querySelector('.reaction-selection-preview');
  const colors = modal.querySelector('.reaction-colors');

  const senderName = gift.sender?.name?.trim() || 'Someone who cares about you';
  const senderPhoto = modal.querySelector('.letter-sender-photo');
  senderPhoto.alt = `Photo of ${senderName}`;
  senderPhoto.src = gift.sender?.photo?.trim() || DEFAULT_SENDER;
  senderPhoto.addEventListener('error', () => {
    if (!senderPhoto.src.endsWith(DEFAULT_SENDER)) senderPhoto.src = DEFAULT_SENDER;
  });
  modal.querySelector('.letter-sender-name').textContent = senderName;
  modal.querySelector('.letter-heading').textContent = gift.letter?.title || 'For you 💌';
  modal.querySelector('.letter-signoff').textContent = gift.letter?.signoff || '';
  modal.querySelector('.letter-empty').hidden = blocks.length > 0;

  ANNOTATION_COLORS.forEach((color, index) => {
    const label = document.createElement('label');
    label.className = `reaction-color reaction-color--${color}`;
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'reaction-color';
    radio.value = color;
    radio.checked = index === 0;
    const swatch = document.createElement('span');
    swatch.textContent = color;
    label.append(radio, swatch);
    colors.append(label);
  });

  function renderLetter() {
    body.replaceChildren();
    blocks.forEach((block) => {
      const group = document.createElement('section');
      group.className = 'letter-block-group';
      const paragraph = document.createElement('p');
      paragraph.className = 'letter-block';
      paragraph.dataset.blockId = block.id;
      const blockRecords = getRenderableAnnotations(
        records.filter((record) => record.blockId === block.id),
        String(block.text ?? '')
      );
      appendHighlightedText(paragraph, String(block.text ?? ''), blockRecords);
      group.append(paragraph);

      blockRecords.forEach((record) => group.append(buildReaction(record)));
      body.append(group);
    });
  }

  function buildReaction(record) {
    const note = document.createElement('aside');
    note.className = `receiver-reaction annotation-${record.color}`;
    note.dataset.annotationId = record.id;
    const quote = document.createElement('q');
    quote.className = 'receiver-reaction-quote';
    quote.textContent = record.selectedText;
    const comment = document.createElement('p');
    comment.textContent = `↳ ${record.comment}`;
    const actions = document.createElement('div');
    actions.className = 'receiver-reaction-actions';
    actions.append(actionButton('Edit', 'edit'), actionButton('Delete', 'delete'));
    note.append(quote, comment, actions);
    return note;
  }

  function actionButton(label, action) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.action = action;
    button.textContent = label;
    return button;
  }

  function evaluateSelection(showErrors = false) {
    if (!modal.isConnected || !composer.hidden) return;
    const result = selectionToAnchor(window.getSelection(), body);
    if (result.error) {
      toolbar.hidden = true;
      pendingAnchor = null;
      if (showErrors && !window.getSelection()?.isCollapsed) showStatus(result.error);
      return;
    }

    const block = blocks.find((item) => item.id === result.blockId);
    const existing = getRenderableAnnotations(
      records.filter((record) => record.blockId === result.blockId),
      String(block?.text ?? '')
    );
    if (existing.some((record) => rangesOverlap(record, result))) {
      toolbar.hidden = true;
      pendingAnchor = null;
      if (showErrors) showStatus('That part already has a reaction 💕');
      return;
    }

    pendingAnchor = result;
    toolbar.hidden = false;
    positionToolbar(result.range.getBoundingClientRect(), toolbar);
  }

  function openComposerForSelection() {
    if (!pendingAnchor) return;
    editingId = null;
    preview.textContent = pendingAnchor.selectedText;
    input.value = '';
    colors.querySelector('input[value="pink"]').checked = true;
    composer.hidden = false;
    toolbar.hidden = true;
    composerDirty = false;
    input.focus();
  }

  function openComposerForEdit(record) {
    editingId = record.id;
    pendingAnchor = null;
    preview.textContent = record.selectedText;
    input.value = record.comment;
    const radio = colors.querySelector(`input[value="${record.color}"]`);
    if (radio) radio.checked = true;
    composer.hidden = false;
    composerDirty = false;
    input.focus();
  }

  function closeComposer() {
    composer.hidden = true;
    composerDirty = false;
    editingId = null;
    pendingAnchor = null;
    input.value = '';
    modal.querySelector('.reaction-composer-error').textContent = '';
    window.getSelection()?.removeAllRanges();
  }

  function saveReaction() {
    const comment = input.value.trim();
    const error = modal.querySelector('.reaction-composer-error');
    if (!comment) {
      error.textContent = 'Write a reaction before saving 💌';
      input.focus();
      return;
    }
    const color = colors.querySelector('input:checked')?.value || 'pink';

    if (editingId) {
      records = records.map((record) => record.id === editingId
        ? { ...record, comment, color }
        : record);
    } else if (pendingAnchor) {
      records.push(createAnnotation({ giftId: gift.id, ...pendingAnchor, comment, color }));
    }

    records = saveGiftAnnotations(gift.id, records);
    closeComposer();
    renderLetter();
    showStatus('Reaction saved to this letter ✨');
  }

  function handleReactionAction(event) {
    const button = event.target.closest('button[data-action]');
    const note = button?.closest('.receiver-reaction');
    if (!button || !note) return;
    const record = records.find((item) => item.id === note.dataset.annotationId);
    if (!record) return;
    if (button.dataset.action === 'edit') openComposerForEdit(record);
    if (button.dataset.action === 'delete'
      && window.confirm('Remove this reaction?')) {
      records = saveGiftAnnotations(gift.id, records.filter((item) => item.id !== record.id));
      renderLetter();
      showStatus('Reaction removed');
    }
  }

  function handleSelectionChange() {
    clearTimeout(selectionTimer);
    selectionTimer = setTimeout(() => evaluateSelection(false), 180);
  }

  function handleTouchEnd() {
    clearTimeout(selectionTimer);
    selectionTimer = setTimeout(() => evaluateSelection(true), 220);
  }

  function hideSelectionToolbar() {
    toolbar.hidden = true;
  }

  function handleReaderKey(event) {
    if (event.key === 'Escape' && !composer.hidden) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!composerDirty || window.confirm('Discard this unfinished reaction?')) closeComposer();
    }
  }

  function showStatus(message) {
    status.textContent = message;
    clearTimeout(showStatus.timer);
    showStatus.timer = setTimeout(() => { status.textContent = ''; }, 3200);
  }

  renderLetter();
  setupMusic(modal, gift.letter?.music);

  toolbar.querySelector('button').addEventListener('pointerdown', (event) => event.preventDefault());
  toolbar.querySelector('button').addEventListener('click', openComposerForSelection);
  modal.querySelector('.reaction-save').addEventListener('click', saveReaction);
  modal.querySelector('.reaction-cancel').addEventListener('click', closeComposer);
  input.addEventListener('input', () => { composerDirty = input.value.trim().length > 0; });
  colors.addEventListener('change', () => { composerDirty = true; });
  body.addEventListener('mouseup', () => evaluateSelection(true));
  body.addEventListener('touchend', handleTouchEnd, { passive: true });
  body.addEventListener('keyup', () => evaluateSelection(true));
  body.addEventListener('click', handleReactionAction);
  document.addEventListener('selectionchange', handleSelectionChange);
  document.addEventListener('keydown', handleReaderKey, true);
  modal.querySelector('.modal-body').addEventListener('scroll', hideSelectionToolbar, { passive: true });

  function cleanup() {
    clearTimeout(selectionTimer);
    clearTimeout(showStatus.timer);
    document.removeEventListener('selectionchange', handleSelectionChange);
    document.removeEventListener('keydown', handleReaderKey, true);
    stopLetterMusic();
    if (activeCleanup === cleanup) activeCleanup = null;
  }
  activeCleanup = cleanup;
  return true;
}

function appendHighlightedText(paragraph, text, records) {
  let cursor = 0;
  records.forEach((record) => {
    paragraph.append(document.createTextNode(text.slice(cursor, record.startOffset)));
    const mark = document.createElement('mark');
    mark.className = `letter-highlight annotation-${record.color}`;
    mark.dataset.annotationId = record.id;
    mark.textContent = text.slice(record.startOffset, record.endOffset);
    paragraph.append(mark);
    cursor = record.endOffset;
  });
  paragraph.append(document.createTextNode(text.slice(cursor)));
}

function positionToolbar(rect, toolbar) {
  const mobile = window.matchMedia('(max-width: 600px)').matches;
  if (mobile) {
    toolbar.style.left = '50%';
    toolbar.style.top = 'auto';
    return;
  }
  const width = 112;
  toolbar.style.left = `${Math.max(10, Math.min(window.innerWidth - width - 10, rect.left + rect.width / 2 - width / 2))}px`;
  toolbar.style.top = `${Math.max(10, rect.top - 48)}px`;
}

function setupMusic(modal, source) {
  const play = modal.querySelector('.letter-music-play');
  const mute = modal.querySelector('.letter-music-mute');
  const volume = modal.querySelector('.letter-volume');
  const status = modal.querySelector('.letter-music-status');
  const section = modal.querySelector('.letter-music');
  const audio = startLetterMusic(source);

  if (!audio) {
    section.classList.add('is-unavailable');
    play.disabled = true;
    mute.disabled = true;
    volume.disabled = true;
    status.textContent = 'No song for this letter';
    return;
  }

  const sync = () => {
    const playing = !audio.paused;
    play.textContent = playing ? '❚❚' : '▶';
    play.setAttribute('aria-label', playing ? 'Pause letter music' : 'Play letter music');
    section.classList.toggle('is-playing', playing);
    mute.textContent = audio.muted ? '🔇' : '🔊';
    mute.setAttribute('aria-label', audio.muted ? 'Unmute letter music' : 'Mute letter music');
  };
  audio.addEventListener('play', sync);
  audio.addEventListener('pause', sync);
  audio.addEventListener('error', () => {
    section.classList.add('is-unavailable');
    play.disabled = true;
    mute.disabled = true;
    volume.disabled = true;
    status.textContent = 'Music unavailable';
  }, { once: true });
  play.addEventListener('click', () => {
    if (audio.paused) audio.play().catch(() => { status.textContent = 'Tap play when you are ready'; });
    else audio.pause();
  });
  mute.addEventListener('click', () => { audio.muted = !audio.muted; sync(); });
  volume.addEventListener('input', () => {
    audio.volume = Number(volume.value);
    if (audio.volume > 0) audio.muted = false;
    sync();
  });
  sync();
}
