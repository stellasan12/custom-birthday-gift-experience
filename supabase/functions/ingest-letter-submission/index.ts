import { createClient } from 'npm:@supabase/supabase-js@2';

const MAX_TEXT = { slug: 120, externalId: 240, name: 200, letter: 20000 };
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_TOTAL_FILE_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MEDIA_CONFIG = {
  sender_photo: { bucket: 'sender-media', directory: 'sender' },
  shared_memory: { bucket: 'gallery-media', directory: 'shared-memory' },
} as const;

type MediaType = keyof typeof MEDIA_CONFIG;
type MediaInput = { filename: string; mimeType: string; base64: string };
type Payload = {
  siteSlug?: unknown;
  externalSubmissionId?: unknown;
  submittedAt?: unknown;
  senderName?: unknown;
  letterContent?: unknown;
  senderPhoto?: unknown;
  sharedMemory?: unknown;
  senderPhotos?: unknown;
  sharedMemories?: unknown;
};

class RequestError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}

const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

const cleanText = (value: unknown, max: number) => {
  if (typeof value !== 'string') return null;
  const clean = value.trim();
  return clean && clean.length <= max ? clean : null;
};

const safeEqual = async (received: string, expected: string) => {
  const bytes = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', bytes.encode(received)),
    crypto.subtle.digest('SHA-256', bytes.encode(expected)),
  ]);
  const left = new Uint8Array(a), right = new Uint8Array(b);
  let mismatch = left.length ^ right.length;
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) mismatch |= (left[index] || 0) ^ (right[index] || 0);
  return mismatch === 0;
};

const normalizeMediaList = (many: unknown, single: unknown): MediaInput[] => {
  const values = Array.isArray(many) ? many : single ? [single] : [];
  return values.map((value) => {
    if (!value || typeof value !== 'object') throw new RequestError(400, 'invalid_media');
    const item = value as Record<string, unknown>;
    const filename = cleanText(item.filename, 240);
    const mimeType = cleanText(item.mimeType, 100)?.toLowerCase();
    const base64 = typeof item.base64 === 'string' ? item.base64.replace(/\s/g, '') : '';
    if (!filename || !mimeType || !ALLOWED_MIME.has(mimeType) || !base64 || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) {
      throw new RequestError(400, 'invalid_media');
    }
    const estimatedBytes = Math.floor(base64.length * 3 / 4) - (base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0);
    if (estimatedBytes <= 0 || estimatedBytes > MAX_FILE_BYTES) throw new RequestError(413, 'media_too_large');
    return { filename, mimeType, base64, estimatedBytes } as MediaInput & { estimatedBytes: number };
  });
};

const decodeBase64 = (value: string) => {
  try {
    const binary = atob(value), bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  } catch { throw new RequestError(400, 'invalid_media'); }
};

const safeFilename = (value: string) => {
  const normalized = value.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(-160);
  return normalized || 'image';
};

const digestPrefix = async (bytes: Uint8Array) => {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return [...digest.slice(0, 10)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

const bytesMatchMime = (bytes: Uint8Array, mimeType: string) => {
  if (mimeType === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === 'image/png') return [0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a].every((value,index)=>bytes[index]===value);
  const head = String.fromCharCode(...bytes.slice(0, 12));
  if (mimeType === 'image/gif') return head.startsWith('GIF87a') || head.startsWith('GIF89a');
  if (mimeType === 'image/webp') return head.startsWith('RIFF') && head.slice(8, 12) === 'WEBP';
  return false;
};

const parsePayload = (body: Payload) => {
  const siteSlug = cleanText(body.siteSlug, MAX_TEXT.slug);
  const externalSubmissionId = cleanText(body.externalSubmissionId, MAX_TEXT.externalId);
  const senderName = cleanText(body.senderName, MAX_TEXT.name);
  const letterContent = cleanText(body.letterContent, MAX_TEXT.letter);
  const submittedAtText = cleanText(body.submittedAt, 80);
  const submittedAt = submittedAtText && !Number.isNaN(Date.parse(submittedAtText)) ? new Date(submittedAtText).toISOString() : null;
  if (!siteSlug || !externalSubmissionId || !senderName || !letterContent || !submittedAt) throw new RequestError(400, 'invalid_submission');
  const senderPhotos = normalizeMediaList(body.senderPhotos, body.senderPhoto);
  const sharedMemories = normalizeMediaList(body.sharedMemories, body.sharedMemory);
  const totalBytes = [...senderPhotos, ...sharedMemories].reduce((sum, item) => sum + (item as MediaInput & { estimatedBytes: number }).estimatedBytes, 0);
  if (totalBytes > MAX_TOTAL_FILE_BYTES) throw new RequestError(413, 'payload_too_large');
  return { siteSlug, externalSubmissionId, senderName, letterContent, submittedAt, senderPhotos, sharedMemories };
};

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);
  try {
    const expectedSecret = Deno.env.get('GOOGLE_FORM_INGEST_SECRET') || '';
    const receivedSecret = request.headers.get('x-ingest-secret') || '';
    if (!expectedSecret || !receivedSecret || !(await safeEqual(receivedSecret, expectedSecret))) {
      return json({ ok: false, error: 'unauthorized' }, 401);
    }

    let raw: Payload;
    try { raw = await request.json(); } catch { throw new RequestError(400, 'invalid_json'); }
    const payload = parsePayload(raw);
    const decodedMedia = new Map<MediaInput, Uint8Array>();
    for (const media of [...payload.senderPhotos, ...payload.sharedMemories]) {
      const bytes = decodeBase64(media.base64);
      if (!bytesMatchMime(bytes, media.mimeType)) throw new RequestError(400, 'invalid_media_content');
      decodedMedia.set(media, bytes);
    }
    const url = Deno.env.get('SUPABASE_URL'), serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !serviceKey) throw new RequestError(500, 'server_not_configured');
    const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

    const siteResult = await supabase.from('gift_sites').select('id').eq('slug', payload.siteSlug).maybeSingle();
    if (siteResult.error) throw siteResult.error;
    if (!siteResult.data) throw new RequestError(404, 'site_not_found');
    const giftSiteId = siteResult.data.id;

    let existing = await supabase.from('letter_submissions').select('id').eq('gift_site_id', giftSiteId).eq('external_submission_id', payload.externalSubmissionId).maybeSingle();
    if (existing.error) throw existing.error;
    let submissionId = existing.data?.id as string | undefined;
    const wasExisting = Boolean(submissionId);
    if (!submissionId) {
      const inserted = await supabase.from('letter_submissions').insert({
        gift_site_id: giftSiteId,
        sender_name: payload.senderName,
        letter_content: payload.letterContent,
        source: 'google_form',
        external_submission_id: payload.externalSubmissionId,
        status: 'pending',
        submitted_at: payload.submittedAt,
      }).select('id').single();
      if (inserted.error?.code === '23505') {
        existing = await supabase.from('letter_submissions').select('id').eq('gift_site_id', giftSiteId).eq('external_submission_id', payload.externalSubmissionId).single();
        if (existing.error) throw existing.error;
        submissionId = existing.data.id;
      } else if (inserted.error) throw inserted.error;
      else submissionId = inserted.data.id;
    }

    const uploadMedia = async (mediaType: MediaType, media: MediaInput) => {
      const config = MEDIA_CONFIG[mediaType], bytes = decodedMedia.get(media);
      if (!bytes) throw new RequestError(400, 'invalid_media');
      const hash = await digestPrefix(bytes);
      const storagePath = `${giftSiteId}/submissions/${submissionId}/${config.directory}/${hash}-${safeFilename(media.filename)}`;
      const uploaded = await supabase.storage.from(config.bucket).upload(storagePath, bytes, { contentType: media.mimeType, upsert: true });
      if (uploaded.error) throw uploaded.error;
      const metadata = await supabase.from('submission_media').upsert({
        submission_id: submissionId,
        media_type: mediaType,
        storage_path: storagePath,
        original_filename: media.filename,
        mime_type: media.mimeType,
      }, { onConflict: 'submission_id,media_type,storage_path', ignoreDuplicates: false });
      if (metadata.error) throw metadata.error;
    };

    for (const media of payload.senderPhotos) await uploadMedia('sender_photo', media);
    for (const media of payload.sharedMemories) await uploadMedia('shared_memory', media);

    return json({ ok: true, status: wasExisting ? 'already_processed' : 'created', submissionId });
  } catch (error) {
    if (error instanceof RequestError) return json({ ok: false, error: error.code }, error.status);
    console.error('ingest-letter-submission failed', error instanceof Error ? error.message : 'unknown error');
    return json({ ok: false, error: 'ingestion_failed', retryable: true }, 502);
  }
});
