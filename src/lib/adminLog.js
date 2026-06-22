/**
 * Lightweight audit-logging helper for admin actions.
 *
 * Writes go directly to the `admin_actions` Supabase table — bypassing the
 * base44Client shim so we don't have to model created_by / updated_date columns
 * on the audit table. RLS guarantees only admins can insert.
 *
 * Usage:
 *   import { logAdminAction } from '@/lib/adminLog';
 *   await logAdminAction(currentUser, {
 *     action: 'approve_student',
 *     target_type: 'student_profile',
 *     target_id: profile.id,
 *     target_label: profile.full_name,
 *     reason: '',
 *     notes: '',
 *     metadata: {},
 *   });
 *
 * The helper is best-effort: it swallows errors so the originating user flow
 * doesn't break just because logging failed (e.g. the caller isn't admin or
 * the table is temporarily unreachable). Failures are surfaced to the console.
 */

import { supabase } from '@/lib/supabaseClient';

const isAdmin = (user) => user?.role === 'admin';

/**
 * @param {object} adminUser - the hydrated current user from AuthContext / auth.me()
 * @param {object} entry
 * @param {string} entry.action - short slug ('approve', 'suspend', 'page_view', ...)
 * @param {string} [entry.target_type] - 'student_profile' | 'recruiter_profile' | 'job' | 'project' | 'page' | ...
 * @param {string|null} [entry.target_id]
 * @param {string} [entry.target_label] - human-friendly identifier (name, title, path)
 * @param {string} [entry.reason]
 * @param {string} [entry.notes]
 * @param {object} [entry.metadata]
 */
export async function logAdminAction(adminUser, entry) {
  if (!isAdmin(adminUser)) return null;
  if (!entry?.action) return null;

  const payload = {
    admin_id: adminUser.id ?? null,
    admin_email: adminUser.email ?? null,
    action: String(entry.action),
    target_type: entry.target_type ?? null,
    target_id: entry.target_id != null ? String(entry.target_id) : null,
    target_label: entry.target_label ?? null,
    reason: entry.reason ?? null,
    notes: entry.notes ?? null,
    metadata: entry.metadata && typeof entry.metadata === 'object' ? entry.metadata : {},
  };

  try {
    const { data, error } = await supabase
      .from('admin_actions')
      .insert(payload)
      .select()
      .single();
    if (error) {
      // eslint-disable-next-line no-console
      console.warn('[adminLog] insert failed', error.message ?? error);
      return null;
    }
    return data;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[adminLog] insert threw', err?.message ?? err);
    return null;
  }
}

/**
 * Fetch the most recent admin actions (admin-only via RLS).
 *
 * @param {object} [opts]
 * @param {number} [opts.limit=200]
 * @param {string} [opts.targetType]
 * @param {string} [opts.targetId]
 * @param {string} [opts.adminId]
 * @param {string} [opts.action]
 */
export async function listAdminActions(opts = {}) {
  const limit = opts.limit ?? 200;
  let q = supabase
    .from('admin_actions')
    .select('*')
    .order('created_date', { ascending: false })
    .limit(limit);
  if (opts.targetType) q = q.eq('target_type', opts.targetType);
  if (opts.targetId) q = q.eq('target_id', opts.targetId);
  if (opts.adminId) q = q.eq('admin_id', opts.adminId);
  if (opts.action) q = q.eq('action', opts.action);

  const { data, error } = await q;
  if (error) {
    // eslint-disable-next-line no-console
    console.warn('[adminLog] list failed', error.message ?? error);
    return [];
  }
  return data ?? [];
}
