import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

function isValidPublicConfig(url, key) {
  if (!url || !key) return false;
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol) && key.length >= 20;
  } catch {
    return false;
  }
}

export const isSupabaseConfigured = isValidPublicConfig(supabaseUrl, supabaseKey);

if (!isSupabaseConfigured) {
  console.warn('[SiteContent] Supabase environment variables are missing; using fallback content.');
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
  : null;
