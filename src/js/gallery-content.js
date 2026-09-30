import { siteData } from '../data/content.js';
import { supabase } from './supabase.js';

const PLACEHOLDER = '/images/gallery/memory-placeholder.svg';
const LOAD_TIMEOUT_MS = 6000;
const present = (value) => typeof value === 'string' && value.trim() ? value.trim() : null;
const withTimeout = (request) => Promise.race([
  Promise.resolve(request),
  new Promise((_, reject) => setTimeout(() => reject(new Error('gallery request timed out')), LOAD_TIMEOUT_MS)),
]);

export async function loadGalleryContent(siteId) {
  if (!supabase || !siteId) return { authoritative: false, albums: siteData.gallery?.albums || [] };
  try {
    const albumResult = await withTimeout(supabase.from('albums')
      .select('id,title,description,cover_url,display_order,created_at')
      .eq('gift_site_id', siteId)
      .eq('is_published', true)
      .order('display_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true }));
    if (albumResult.error) throw albumResult.error;
    const rows = albumResult.data || [];
    if (!rows.length) return { authoritative: true, albums: [] };

    const photoResult = await withTimeout(supabase.from('photos')
      .select('id,album_id,source_submission_id,image_url,caption,alt_text,photo_date,display_order,created_at')
      .in('album_id', rows.map((album) => album.id))
      .eq('is_published', true)
      .order('display_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true }));
    if (photoResult.error) throw photoResult.error;
    const grouped = new Map(rows.map((album) => [album.id, []]));
    (photoResult.data || []).forEach((photo) => {
      const src = present(photo.image_url);
      if (!src || !grouped.has(photo.album_id)) return;
      grouped.get(photo.album_id).push({
        id: String(photo.id), src,
        alt: present(photo.alt_text) || present(photo.caption) || 'Birthday memory',
        caption: present(photo.caption) || '', date: photo.photo_date || null,
        displayOrder: photo.display_order, sourceSubmissionId: photo.source_submission_id || null,
      });
    });
    return {
      authoritative: true,
      albums: rows.map((album) => {
        const photos = grouped.get(album.id) || [];
        return {
          id: String(album.id), title: present(album.title) || 'Untitled memories',
          description: present(album.description) || '',
          coverImage: present(album.cover_url) || photos[0]?.src || PLACEHOLDER,
          displayOrder: album.display_order, photos,
        };
      }),
    };
  } catch (error) {
    console.warn('[GalleryContent] Gallery unavailable; using static fallback memories.', error?.message || error);
    return { authoritative: false, albums: siteData.gallery?.albums || [] };
  }
}
