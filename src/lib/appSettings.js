/**
 * Tiny client for the `app_settings` singleton table.
 *
 * The row is read by anyone (auth + anon), so the moderation toggle can be
 * checked at signup time. Writes are admin-only via RLS.
 */

import { supabase } from '@/lib/supabaseClient';

export const DEFAULT_APP_SETTINGS = Object.freeze({
  moderation_students: false,
  moderation_recruiters: false,
  trusted_student_email_domains: [],
  log_admin_page_views: true,
});

let cached = null;
let cacheLoadedAt = 0;
const CACHE_TTL_MS = 30_000;

const normalize = (row) => {
  if (!row) return { ...DEFAULT_APP_SETTINGS };
  return {
    id: row.id,
    moderation_students: !!row.moderation_students,
    moderation_recruiters: !!row.moderation_recruiters,
    trusted_student_email_domains: Array.isArray(row.trusted_student_email_domains)
      ? row.trusted_student_email_domains
      : [],
    log_admin_page_views: row.log_admin_page_views !== false,
    updated_date: row.updated_date,
  };
};

export async function loadAppSettings({ force = false } = {}) {
  const now = Date.now();
  if (!force && cached && now - cacheLoadedAt < CACHE_TTL_MS) {
    return cached;
  }
  const { data, error } = await supabase
    .from('app_settings')
    .select('*')
    .order('created_date', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) {
    // eslint-disable-next-line no-console
    console.warn('[appSettings] load failed; using defaults', error.message ?? error);
    cached = { ...DEFAULT_APP_SETTINGS };
    cacheLoadedAt = now;
    return cached;
  }
  cached = normalize(data);
  cacheLoadedAt = now;
  return cached;
}

export async function updateAppSettings(patch) {
  // Load the current row id (or insert one if missing).
  const current = await loadAppSettings({ force: true });
  if (current?.id) {
    const { data, error } = await supabase
      .from('app_settings')
      .update({ ...patch, updated_date: new Date().toISOString() })
      .eq('id', current.id)
      .select()
      .single();
    if (error) throw error;
    cached = normalize(data);
    cacheLoadedAt = Date.now();
    return cached;
  }
  const { data, error } = await supabase
    .from('app_settings')
    .insert({ ...patch, singleton: true })
    .select()
    .single();
  if (error) throw error;
  cached = normalize(data);
  cacheLoadedAt = Date.now();
  return cached;
}

/**
 * Synchronous read of last-known settings (or defaults). Use this for
 * non-blocking checks; call loadAppSettings() first to ensure freshness.
 */
export function readCachedAppSettings() {
  return cached ?? { ...DEFAULT_APP_SETTINGS };
}

/**
 * Is the email domain in the trusted student list? Used for auto-verify on
 * signup. Case-insensitive; matches the suffix after the last '@'.
 */
export function isTrustedStudentEmail(email, settings) {
  if (!email || typeof email !== 'string') return false;
  const at = email.lastIndexOf('@');
  if (at < 0) return false;
  const domain = email.slice(at + 1).toLowerCase().trim();
  if (!domain) return false;
  const list = Array.isArray(settings?.trusted_student_email_domains)
    ? settings.trusted_student_email_domains
    : [];
  return list
    .map((d) => String(d ?? '').toLowerCase().trim())
    .filter(Boolean)
    .some((d) => domain === d || domain.endsWith(`.${d}`));
}
