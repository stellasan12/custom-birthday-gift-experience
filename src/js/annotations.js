/** Pure helpers for serializable, block-anchored letter annotations. */

export const ANNOTATION_COLORS = ['pink', 'lavender', 'yellow', 'blue', 'green'];

export function createAnnotation({ giftId, blockId, startOffset, endOffset, selectedText, comment, color }) {
  return {
    id: globalThis.crypto?.randomUUID?.()
      || `annotation-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    giftId,
    blockId,
    startOffset,
    endOffset,
    selectedText,
    comment: comment.trim(),
    color: ANNOTATION_COLORS.includes(color) ? color : 'pink',
    createdAt: new Date().toISOString(),
  };
}

/** Resolve an anchor against canonical text, recovering only one exact unique match. */
export function resolveAnnotation(record, canonicalText) {
  if (!record || typeof canonicalText !== 'string'
    || typeof record.id !== 'string'
    || typeof record.blockId !== 'string'
    || typeof record.selectedText !== 'string' || !record.selectedText
    || typeof record.comment !== 'string') return null;
  const start = Number(record.startOffset);
  const end = Number(record.endOffset);
  const normalized = {
    ...record,
    color: ANNOTATION_COLORS.includes(record.color) ? record.color : 'pink',
  };

  if (Number.isInteger(start) && Number.isInteger(end)
    && start >= 0 && end > start && end <= canonicalText.length
    && canonicalText.slice(start, end) === record.selectedText) {
    return { ...normalized, startOffset: start, endOffset: end };
  }

  const recoveredStart = canonicalText.indexOf(record.selectedText);
  if (recoveredStart < 0
    || canonicalText.indexOf(record.selectedText, recoveredStart + 1) !== -1) return null;

  return {
    ...normalized,
    startOffset: recoveredStart,
    endOffset: recoveredStart + record.selectedText.length,
  };
}

export function rangesOverlap(a, b) {
  return a.startOffset < b.endOffset && b.startOffset < a.endOffset;
}

/** Resolve, sort, and reject corrupt/overlapping stored records safely. */
export function getRenderableAnnotations(records, canonicalText) {
  const accepted = [];
  for (const record of records.map((item) => resolveAnnotation(item, canonicalText)).filter(Boolean)
    .sort((a, b) => a.startOffset - b.startOffset || a.endOffset - b.endOffset)) {
    if (!accepted.some((existing) => rangesOverlap(existing, record))) accepted.push(record);
  }
  return accepted;
}

/** Convert a browser selection inside one .letter-block into canonical UTF-16 offsets. */
export function selectionToAnchor(selection, letterBody) {
  if (!selection || selection.rangeCount !== 1 || selection.isCollapsed) {
    return { error: 'Select a little piece of the letter first 💌' };
  }

  const range = selection.getRangeAt(0);
  const startBlock = closestBlock(range.startContainer);
  const endBlock = closestBlock(range.endContainer);
  if (!startBlock || !endBlock || !letterBody.contains(startBlock) || !letterBody.contains(endBlock)) {
    return { error: 'Reactions can only be added to the letter text 💌' };
  }
  if (startBlock !== endBlock) {
    return { error: 'Select text from one paragraph at a time 💌' };
  }

  const before = document.createRange();
  before.selectNodeContents(startBlock);
  before.setEnd(range.startContainer, range.startOffset);
  const selected = document.createRange();
  selected.selectNodeContents(startBlock);
  selected.setStart(range.startContainer, range.startOffset);
  selected.setEnd(range.endContainer, range.endOffset);

  const startOffset = before.toString().length;
  const selectedText = selected.toString();
  if (!selectedText.trim()) return { error: 'Select actual words to react to 💌' };

  return {
    blockId: startBlock.dataset.blockId,
    startOffset,
    endOffset: startOffset + selectedText.length,
    selectedText,
    range,
  };
}

function closestBlock(node) {
  const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
  return element?.closest?.('.letter-block') || null;
}
