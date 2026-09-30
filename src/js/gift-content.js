import { siteData } from '../data/content.js';
import { supabase } from './supabase.js';

const DEFAULT_SENDER = '/images/placeholders/default-sender.svg';
const DEFAULT_CHARACTER = '/images/placeholders/birthday-character.svg';
const LOAD_TIMEOUT_MS = 6000;
const present = (value) => typeof value === 'string' && value.trim() ? value.trim() : null;
const withTimeout = (request) => Promise.race([
  Promise.resolve(request),
  new Promise((_, reject) => setTimeout(() => reject(new Error('gift request timed out')), LOAD_TIMEOUT_MS)),
]);

function legacyBlocks(content) {
  const text = present(content);
  if (!text) return [];
  return text.split(/\r?\n\s*\r?\n/).map((paragraph) => paragraph.trim()).filter(Boolean)
    .map((paragraph, index) => ({ id: `legacy-p${index + 1}`, text: paragraph }));
}

function normalizeGift(letter, blocks) {
  const senderName = present(letter.sender_name) || 'Someone who cares about you';
  const normalizedBlocks = blocks.length
    ? blocks.map((block) => ({ id: present(block.block_key) || `block-${block.id}`, text: present(block.content) || '' })).filter((block) => block.text)
    : legacyBlocks(letter.content);
  return {
    id: String(letter.id),
    characterName: `Gift from ${senderName}`,
    characterImage: present(letter.character_image_url) || DEFAULT_CHARACTER,
    sender: { name: senderName, photo: present(letter.sender_photo_url) || DEFAULT_SENDER },
    letter: {
      title: present(letter.title) || 'For you 💌',
      content: normalizedBlocks,
      signoff: '',
      music: present(letter.music_url),
    },
  };
}

export async function loadPublishedGifts(siteId) {
  if (!supabase || !siteId) return { authoritative: false, gifts: siteData.gifts };
  try {
    const lettersResult = await withTimeout(supabase.from('letters')
      .select('id,sender_name,sender_photo_url,title,content,character_image_url,music_url,display_order,created_at')
      .eq('gift_site_id', siteId)
      .eq('is_published', true)
      .order('display_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true }));
    if (lettersResult.error) throw lettersResult.error;
    const letters = lettersResult.data || [];
    if (!letters.length) return { authoritative: true, gifts: [] };

    const ids = letters.map((letter) => letter.id);
    const blocksResult = await withTimeout(supabase.from('letter_blocks')
      .select('id,letter_id,block_key,content,display_order,created_at')
      .in('letter_id', ids)
      .order('display_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true }));
    if (blocksResult.error) throw blocksResult.error;
    const grouped = new Map(ids.map((id) => [id, []]));
    (blocksResult.data || []).forEach((block) => grouped.get(block.letter_id)?.push(block));
    return { authoritative: true, gifts: letters.map((letter) => normalizeGift(letter, grouped.get(letter.id) || [])) };
  } catch (error) {
    console.warn('[GiftContent] Published letters unavailable; using static fallback gifts.', error?.message || error);
    return { authoritative: false, gifts: siteData.gifts };
  }
}
