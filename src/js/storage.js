/**
 * Storage Utility — Birthday Gift Experience
 *
 * Safe abstraction around localStorage with error handling for
 * missing storage, quota limits, or corrupted JSON data.
 */

const STORAGE_KEY = 'birthdayGiftExperience';

const defaultState = {
  hasRevealedGifts: false,
  viewedGiftIds: [],
  unlockedAll: false,
};

/**
 * Read the current stored progress state.
 * @returns {typeof defaultState}
 */
export function getStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultState };
    const parsed = JSON.parse(raw);
    return {
      hasRevealedGifts: Boolean(parsed.hasRevealedGifts),
      viewedGiftIds: Array.isArray(parsed.viewedGiftIds) ? parsed.viewedGiftIds : [],
      unlockedAll: Boolean(parsed.unlockedAll),
    };
  } catch (err) {
    console.warn('[Storage] Failed to read from localStorage:', err);
    return { ...defaultState };
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

  const unlockedAll = current.unlockedAll || allViewedNow;

  saveStorage({
    viewedGiftIds: updatedIds,
    unlockedAll: unlockedAll,
  });

  return {
    isNewView: !alreadyViewed,
    allViewedNow: allViewedNow && !current.unlockedAll,
  };
}

/**
 * Check if all gifts have been unlocked.
 */
export function isAllUnlocked() {
  return getStorage().unlockedAll;
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
