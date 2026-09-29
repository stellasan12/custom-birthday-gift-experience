import { getPhotoComments, savePhotoComments } from './storage.js';

export const NOTE_COLORS = ['pink', 'lavender', 'yellow', 'blue', 'green'];

export function addPhotoComment(photoId, text, color = 'pink') {
  const clean = text.trim();
  if (!clean) return getPhotoComments(photoId);
  const comments = getPhotoComments(photoId);
  comments.push({ id: crypto.randomUUID?.() || `note-${Date.now()}`, photoId, text: clean, color: NOTE_COLORS.includes(color) ? color : 'pink', createdAt: new Date().toISOString() });
  savePhotoComments(photoId, comments);
  return comments;
}

export function editPhotoComment(photoId, commentId, text, color) {
  const clean = text.trim();
  const comments = getPhotoComments(photoId).map((note) => note.id === commentId && clean
    ? { ...note, text: clean, color: NOTE_COLORS.includes(color) ? color : note.color, editedAt: new Date().toISOString() }
    : note);
  savePhotoComments(photoId, comments);
  return comments;
}

export function deletePhotoComment(photoId, commentId) {
  const comments = getPhotoComments(photoId).filter((note) => note.id !== commentId);
  savePhotoComments(photoId, comments);
  return comments;
}

export { getPhotoComments };
