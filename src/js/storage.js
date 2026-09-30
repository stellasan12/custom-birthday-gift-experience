/**
 * Storage Utility — Birthday Gift Experience
 *
 * Safe abstraction around localStorage with error handling for
 * missing storage, quota limits, or corrupted JSON data.
 */

const STORAGE_KEY = 'birthdayGiftExperience';

export const DEFAULT_SETTINGS = Object.freeze({
  theme: 'birthday',
  fontSize: 'normal',
  volume: 0.7,
  muted: false,
});

const THEMES = new Set(['birthday', 'lavender', 'peach', 'mint']);
const FONT_SIZES = new Set(['small', 'normal', 'large', 'extra-large']);

const defaultState = {
  hasRevealedGifts: false,
  viewedGiftIds: [],
  allGiftsViewed: false,
  annotations: {},
  settings: DEFAULT_SETTINGS,
  gallery: {
    preferredView: 'gallery',
    photoComments: {},
    favoritePhotoIds: [],
    albumOrder: [],
    photoOrder: {},
  },
};

function sanitizeSettings(value) {
  const settings = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const volume = Number(settings.volume);
  return {
    theme: THEMES.has(settings.theme) ? settings.theme : DEFAULT_SETTINGS.theme,
    fontSize: FONT_SIZES.has(settings.fontSize) ? settings.fontSize : DEFAULT_SETTINGS.fontSize,
    volume: Number.isFinite(volume) ? Math.max(0, Math.min(1, volume)) : DEFAULT_SETTINGS.volume,
    muted: typeof settings.muted === 'boolean' ? settings.muted : DEFAULT_SETTINGS.muted,
  };
}

function sanitizeGallery(value) {
  const gallery = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const rawComments = gallery.photoComments && typeof gallery.photoComments === 'object'
    ? gallery.photoComments : {};
  const photoComments = Object.fromEntries(Object.entries(rawComments).map(([photoId, notes]) => [
    photoId,
    Array.isArray(notes) ? notes.filter((note) => note && typeof note.id === 'string' && typeof note.text === 'string') : [],
  ]));
  return {
    preferredView: gallery.preferredView === 'social' ? 'social' : 'gallery',
    photoComments,
    favoritePhotoIds: Array.isArray(gallery.favoritePhotoIds)
      ? [...new Set(gallery.favoritePhotoIds.filter((id) => typeof id === 'string'))] : [],
    albumOrder: Array.isArray(gallery.albumOrder)
      ? [...new Set(gallery.albumOrder.filter((id) => typeof id === 'string'))] : [],
    photoOrder: gallery.photoOrder && typeof gallery.photoOrder === 'object'
      ? Object.fromEntries(Object.entries(gallery.photoOrder).map(([albumId, ids]) => [
        albumId,
        Array.isArray(ids) ? [...new Set(ids.filter((id) => typeof id === 'string'))] : [],
      ])) : {},
  };
}

function sanitizeAnnotations(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value).map(([giftId, records]) => [
      giftId,
      Array.isArray(records)
        ? records.filter((record) => record && typeof record === 'object')
        : [],
    ])
  );
}

/**
 * Read the current stored progress state.
 * @returns {typeof defaultState}
 */
export function getStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultState, settings: { ...DEFAULT_SETTINGS } };
    const parsed = JSON.parse(raw);
    return {
      hasRevealedGifts: Boolean(parsed.hasRevealedGifts),
      viewedGiftIds: Array.isArray(parsed.viewedGiftIds)
        ? [...new Set(parsed.viewedGiftIds.filter((id) => typeof id === 'string'))]
        : [],
      allGiftsViewed: Boolean(parsed.allGiftsViewed ?? parsed.unlockedAll),
      annotations: sanitizeAnnotations(parsed.annotations),
      gallery: sanitizeGallery(parsed.gallery),
      settings: sanitizeSettings(parsed.settings),
    };
  } catch (err) {
    console.warn('[Storage] Failed to read from localStorage:', err);
    return { ...defaultState, settings: { ...DEFAULT_SETTINGS } };
  }
}

/**
 * Write updated progress state to storage.
 * @param {Partial<typeof defaultState>} updates
 */
export function saveStorage(updates) {
  try {
    const current = getStorage();
    const next = { ...current, ...updates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  } catch (err) {
    console.warn('[Storage] Failed to save to localStorage:', err);
    return getStorage();
  }
}

/**
 * Check if the "CLICK ME" gift reveal has been completed.
 */
export function isGiftsRevealed() {
  return getStorage().hasRevealedGifts;
}

/**
 * Mark the "CLICK ME" gift reveal as completed.
 * @param {boolean} revealed
 */
export function setGiftsRevealed(revealed = true) {
  return saveStorage({ hasRevealedGifts: revealed });
}

/**
 * Check if a specific gift ID has been viewed.
 * @param {string} giftId
 */
export function isGiftViewed(giftId) {
  return getStorage().viewedGiftIds.includes(giftId);
}

/**
 * Mark a gift ID as viewed and check if all configured gifts are viewed.
 * @param {string} giftId
 * @param {string[]} configuredGiftIds
 * @returns {{ isNewView: boolean, allViewedNow: boolean }}
 */
export function markGiftViewed(giftId, configuredGiftIds = []) {
  const current = getStorage();
  const alreadyViewed = current.viewedGiftIds.includes(giftId);
  const updatedIds = alreadyViewed
    ? current.viewedGiftIds
    : [...current.viewedGiftIds, giftId];

  // Dynamically check if all configured gifts are viewed
  const allViewedNow =
    configuredGiftIds.length > 0 &&
    configuredGiftIds.every((id) => updatedIds.includes(id));

  saveStorage({
    viewedGiftIds: updatedIds,
    allGiftsViewed: allViewedNow,
  });

  return {
    isNewView: !alreadyViewed,
    allViewedNow: allViewedNow && !current.allGiftsViewed,
  };
}

/**
 * Check if all gifts have been unlocked.
 */
export function isAllUnlocked(configuredGiftIds = null) {
  const state = getStorage();
  if (!Array.isArray(configuredGiftIds)) return state.allGiftsViewed;

  const allGiftsViewed = configuredGiftIds.every((id) => state.viewedGiftIds.includes(id));

  if (allGiftsViewed !== state.allGiftsViewed) {
    saveStorage({ allGiftsViewed });
  }
  return allGiftsViewed;
}

/** Return a copy of the receiver annotations saved for one gift. */
export function getGiftAnnotations(giftId) {
  return [...(getStorage().annotations[giftId] || [])];
}

/** Replace the receiver annotations for one gift. */
export function saveGiftAnnotations(giftId, records) {
  const state = getStorage();
  const annotations = {
    ...state.annotations,
    [giftId]: Array.isArray(records) ? records : [],
  };
  saveStorage({ annotations });
  return [...annotations[giftId]];
}

export function getGalleryState() {
  const gallery = getStorage().gallery;
  return { ...gallery, photoComments: { ...gallery.photoComments }, favoritePhotoIds: [...gallery.favoritePhotoIds] };
}

export function saveGalleryState(updates) {
  const state = getStorage();
  return saveStorage({ gallery: sanitizeGallery({ ...state.gallery, ...updates }) }).gallery;
}

export function getPhotoComments(photoId) {
  return [...(getGalleryState().photoComments[photoId] || [])];
}

export function savePhotoComments(photoId, comments) {
  const gallery = getGalleryState();
  return saveGalleryState({ photoComments: { ...gallery.photoComments, [photoId]: comments } });
}

export function getSettings() {
  return { ...getStorage().settings };
}

export function saveSettings(updates) {
  const state = getStorage();
  return saveStorage({ settings: sanitizeSettings({ ...state.settings, ...updates }) }).settings;
}

export function resetSettings() {
  return saveStorage({ settings: { ...DEFAULT_SETTINGS } }).settings;
}

/**
 * Reset all stored progress back to default.
 */
export function resetStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('[Storage] Failed to clear localStorage:', err);
  }
  return { ...defaultState };
}
