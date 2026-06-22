/**
 * Referral link helpers — F6 (Recruiter Referral Links).
 *
 * - generateReferralCode(): 8-char URL-safe code (~218 trillion combos).
 * - createReferralLink(): writes a referral_links row, retrying on the
 *   ultra-unlikely code collision.
 * - recordReferralClick(): writes a referral_clicks row AND increments the
 *   parent link's total_clicks counter. Resilient to logged-out callers.
 * - applyPendingReferralAttribution(): drains a sessionStorage slot left by
 *   the /r/:code landing page and writes a referral_signups row for the
 *   freshly-signed-up account.
 *
 * The session slot is the simplest cross-page transport: the public landing
 * stashes the code, the user clicks "Sign up", and AuthContext.signInOrSignUp
 * picks it up post-signup. localStorage would persist forever; we want the
 * attribution to expire when the tab closes.
 */

import { base44 } from '@/api/base44Client';
import { supabase } from '@/lib/supabaseClient';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 → less ambiguous
const CODE_LEN = 8;

const SESSION_KEY = 'cc.pendingReferralCode';

export const generateReferralCode = () => {
  let out = '';
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const buf = new Uint32Array(CODE_LEN);
    crypto.getRandomValues(buf);
    for (let i = 0; i < CODE_LEN; i += 1) {
      out += ALPHABET[buf[i] % ALPHABET.length];
    }
  } else {
    for (let i = 0; i < CODE_LEN; i += 1) {
      out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    }
  }
  return out;
};

/**
 * Build the publicly shareable absolute URL for a referral link.
 */
export const buildReferralUrl = (code) => {
  if (typeof window === 'undefined') return `/r/${code}`;
  const origin = window.location.origin;
  return `${origin}/r/${code}`;
};

export const stashPendingReferral = (code) => {
  if (typeof window === 'undefined' || !code) return;
  try {
    window.sessionStorage.setItem(SESSION_KEY, code);
  } catch {
    /* sessionStorage blocked — fine, attribution just won't fire */
  }
};

export const readPendingReferral = () => {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
};

export const clearPendingReferral = () => {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* noop */
  }
};

/**
 * Create a referral link for the given target. Retries up to 3 times on the
 * astronomically unlikely event of a code collision (unique constraint).
 */
export const createReferralLink = async ({
  recruiter,
  target,
  label,
}) => {
  let lastError = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const code = generateReferralCode();
    try {
      const row = await base44.entities.ReferralLink.create({
        recruiter_email: recruiter.email,
        recruiter_name: recruiter.full_name ?? null,
        company: recruiter.company ?? null,
        target_type: target.type,
        target_id: target.id ?? null,
        target_label: target.label ?? null,
        target_summary: target.summary ?? null,
        code,
        label: label ?? null,
        is_active: true,
      });
      return row;
    } catch (e) {
      lastError = e;
      // 23505 = unique_violation in Postgres. Retry with a new code.
      if (!String(e?.message ?? '').includes('duplicate')) throw e;
    }
  }
  throw lastError ?? new Error('Could not generate a unique referral code.');
};

/**
 * Look up a referral link by its public code. Works for both anon and
 * authenticated callers (anon SELECT is policy-allowed for active links).
 */
export const getReferralLinkByCode = async (code) => {
  if (!code) return null;
  const rows = await base44.entities.ReferralLink.filter({ code });
  return rows?.[0] ?? null;
};

const fingerprintVisitor = () => {
  if (typeof window === 'undefined') return null;
  const parts = [
    window.navigator?.userAgent ?? '',
    window.navigator?.language ?? '',
    String(window.screen?.width ?? ''),
    String(window.screen?.height ?? ''),
    String(new Date().getTimezoneOffset()),
  ].join('|');
  // Lightweight non-crypto hash (FNV-1a 32) — good enough for dedupe heuristics.
  let h = 2166136261;
  for (let i = 0; i < parts.length; i += 1) {
    h ^= parts.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
};

/**
 * Record a single visit to /r/:code. Uses the supabase client directly so the
 * anon RLS policy applies even when no session is present. The denormalized
 * counter on referral_links is bumped via a follow-up update; failures are
 * swallowed so the public landing never breaks.
 */
export const recordReferralClick = async ({ link, visitorEmail }) => {
  if (!link) return null;
  const payload = {
    link_id: link.id,
    link_code: link.code,
    visitor_email: visitorEmail ?? null,
    visitor_fingerprint: fingerprintVisitor(),
    referrer: typeof document !== 'undefined' ? document.referrer || null : null,
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent || null : null,
  };
  try {
    await supabase.from('referral_clicks').insert(payload);
  } catch {
    /* swallow — analytics shouldn't break UX */
  }
  // Best-effort counter bump; ignore failures (most likely anon update RLS).
  try {
    await supabase
      .from('referral_links')
      .update({
        total_clicks: (link.total_clicks ?? 0) + 1,
        updated_date: new Date().toISOString(),
      })
      .eq('id', link.id);
  } catch {
    /* noop */
  }
};

/**
 * Called after the user successfully signs up. If a referral code is stashed
 * in sessionStorage, write a referral_signups row and bump the link's
 * total_signups counter, then clear the slot.
 */
export const applyPendingReferralAttribution = async ({ user }) => {
  const code = readPendingReferral();
  if (!code) return null;
  const link = await getReferralLinkByCode(code);
  if (!link) {
    clearPendingReferral();
    return null;
  }
  try {
    await base44.entities.ReferralSignup.create({
      link_id: link.id,
      link_code: code,
      signup_email: user.email,
      signup_role: user.role ?? null,
    });
    await supabase
      .from('referral_links')
      .update({
        total_signups: (link.total_signups ?? 0) + 1,
        updated_date: new Date().toISOString(),
      })
      .eq('id', link.id);
  } catch (e) {
    // Duplicate signup attribution per (email, link) is fine — drop silently.
    if (!String(e?.message ?? '').includes('duplicate')) {
      // eslint-disable-next-line no-console
      console.warn('[referrals] attribution failed', e.message ?? e);
    }
  }
  clearPendingReferral();
  return link;
};
