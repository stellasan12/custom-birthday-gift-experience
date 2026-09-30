import { siteData } from '../data/content.js';
import { supabase } from './supabase.js';

export const SITE_SLUG = 'happy-birthday-name';
const LOAD_TIMEOUT_MS = 6000;
const POSITIONS = new Set(['top-left','top-right','side-left','side-right','bottom-left','bottom-right']);
const TYPES = new Set(['petals','video','music','decorative']);

const present = (value) => typeof value === 'string' && value.trim() ? value.trim() : null;
const withTimeout = (promise) => Promise.race([
  Promise.resolve(promise),
  new Promise((_, reject) => setTimeout(() => reject(new Error('content request timed out')), LOAD_TIMEOUT_MS)),
]);

async function forSite(table, columns, siteId, { order = false, single = false } = {}) {
  let query = supabase.from(table).select(columns).eq('gift_site_id', siteId);
  if (order) query = query.order('display_order', { ascending: true });
  if (single) query = query.maybeSingle();
  const result = await withTimeout(query);
  if (result.error) throw result.error;
  return result.data;
}

function normalizeSticker(row, index) {
  const type = TYPES.has(row.sticker_type) ? row.sticker_type : 'decorative';
  const media = present(row.media_url);
  return {
    id: String(row.id || `sticker-${index + 1}`),
    label: present(row.name) || 'Birthday decoration',
    type,
    image: present(row.image_url),
    video: type === 'video' ? media : null,
    music: type === 'music' ? media : null,
    media,
    positionKey: POSITIONS.has(row.position_key) ? row.position_key : 'bottom-left',
  };
}

export async function loadSiteContent(siteSlug = SITE_SLUG) {
  if (!supabase) return siteData;
  try {
    const siteResult = await withTimeout(
      supabase.from('gift_sites')
        .select('id,slug,celebrant_name,birthday_message')
        .eq('slug', siteSlug)
        .maybeSingle()
    );
    if (siteResult.error) throw siteResult.error;
    if (!siteResult.data) throw new Error(`published site not found for slug ${siteSlug}`);
    const site = siteResult.data;
    const [settings, slides, stickers] = await Promise.all([
      forSite('site_settings', 'intro_type,intro_video_url,homepage_character_url,global_music_url', site.id, { single: true }),
      forSite('intro_slides', 'image_url,alt_text,display_order', site.id, { order: true }),
      forSite('interactive_stickers', 'id,name,sticker_type,image_url,media_url,position_key,display_order', site.id, { order: true }),
    ]);
    const activeSlides = (slides || []).map((slide) => ({ src: present(slide.image_url), alt: present(slide.alt_text) || 'Birthday intro image' })).filter((slide) => slide.src);
    const introType = settings?.intro_type === 'video' && present(settings.intro_video_url) ? 'video' : 'slideshow';
    const normalized = {
      siteId: site.id,
      celebrant: {
        ...siteData.celebrant,
        name: present(site.celebrant_name) || siteData.celebrant.name,
        birthdayMessage: present(site.birthday_message) || siteData.celebrant.birthdayMessage || siteData.homepage.greeting,
      },
      intro: {
        ...siteData.intro,
        type: introType,
        slides: activeSlides.length ? activeSlides : siteData.intro.slides,
        video: present(settings?.intro_video_url) || siteData.intro.video,
      },
      homepage: {
        ...siteData.homepage,
        greeting: present(site.birthday_message) || siteData.homepage.greeting,
        characterImage: present(settings?.homepage_character_url) || siteData.homepage.characterImage,
      },
      audio: {
        ...siteData.audio,
        globalBackgroundMusic: present(settings?.global_music_url),
      },
      stickers: (stickers || []).length ? stickers.map(normalizeSticker) : siteData.stickers,
    };
    Object.assign(siteData, normalized);
    console.info(`[SiteContent] Loaded Supabase site: ${siteSlug}`);
    return siteData;
  } catch (error) {
    console.warn(`[SiteContent] Supabase unavailable for ${siteSlug}; using fallback content.`, error?.message || error);
    return siteData;
  }
}
