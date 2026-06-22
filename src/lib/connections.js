/**
 * Connection helpers — F4 (Swipe for Connections).
 *
 * Encapsulates the "right swipe + mutual match" mechanics so the page
 * components stay focused on UI. The wire protocol is:
 *
 *   1. Swiper writes a `connection_swipes` row (direction='right'|'left').
 *      Re-swiping the same target overwrites the prior row (unique index on
 *      swiper_email + target_email).
 *   2. On a right swipe, we look for an existing right swipe by the target
 *      against the swiper. If one exists, we materialize a `connections` row
 *      AND a synthetic `matches` row so the existing Messages page can render
 *      a chat thread for the peer-to-peer connection.
 *
 * All emails are lowercased + trimmed before storage and comparison so
 * "Foo@x.com" and "foo@x.com" are treated as the same person.
 */

import { base44 } from '@/api/base44Client';

export const normalizeEmail = (email) =>
  (email ?? '').toString().trim().toLowerCase();

/**
 * Canonical (a, b) ordering — lexically smaller email goes into user_a so the
 * unique index works regardless of who swiped first.
 */
export const canonicalPair = (emailA, emailB, profilesByEmail = {}) => {
  const a = normalizeEmail(emailA);
  const b = normalizeEmail(emailB);
  const [low, high] = a < b ? [a, b] : [b, a];
  const lowProfile = profilesByEmail[low] ?? null;
  const highProfile = profilesByEmail[high] ?? null;
  return {
    user_a_email: low,
    user_b_email: high,
    user_a_role: lowProfile?.role ?? null,
    user_b_role: highProfile?.role ?? null,
    user_a_name: lowProfile?.full_name ?? null,
    user_b_name: highProfile?.full_name ?? null,
  };
};

/**
 * Look up an existing connection row for a pair (canonical-order safe).
 */
export const findConnection = async (emailA, emailB) => {
  const a = normalizeEmail(emailA);
  const b = normalizeEmail(emailB);
  const [low, high] = a < b ? [a, b] : [b, a];
  const rows = await base44.entities.Connection.filter({
    user_a_email: low,
    user_b_email: high,
  });
  return rows?.[0] ?? null;
};

/**
 * Find a swipe row for (swiper, target).
 */
export const findSwipe = async (swiperEmail, targetEmail) => {
  const rows = await base44.entities.ConnectionSwipe.filter({
    swiper_email: normalizeEmail(swiperEmail),
    target_email: normalizeEmail(targetEmail),
  });
  return rows?.[0] ?? null;
};

/**
 * Record / overwrite a swipe row.
 */
export const recordSwipe = async ({
  swiper,
  target,
  direction,
}) => {
  const swiperEmail = normalizeEmail(swiper.email);
  const targetEmail = normalizeEmail(target.email);
  const payload = {
    swiper_email: swiperEmail,
    swiper_role: swiper.role ?? null,
    target_email: targetEmail,
    target_role: target.role ?? null,
    direction,
  };
  const existing = await findSwipe(swiperEmail, targetEmail);
  if (existing) {
    if (existing.direction === direction) return existing;
    return base44.entities.ConnectionSwipe.update(existing.id, { direction });
  }
  return base44.entities.ConnectionSwipe.create(payload);
};

/**
 * Materialize a connection + a synthetic match row for chat.
 * Idempotent: if the connection already exists, returns it unchanged.
 *
 * `swiper` / `target` are { email, full_name, role } objects.
 */
export const createMutualConnection = async ({ swiper, target }) => {
  const swiperEmail = normalizeEmail(swiper.email);
  const targetEmail = normalizeEmail(target.email);
  const existing = await findConnection(swiperEmail, targetEmail);
  if (existing) return existing;

  const profilesByEmail = {
    [swiperEmail]: swiper,
    [targetEmail]: target,
  };
  const pair = canonicalPair(swiperEmail, targetEmail, profilesByEmail);

  // Mirror the connection into the matches table so Messages.jsx (which keys
  // off match_id) renders a thread for it. We tag it via data.kind so the UI
  // can distinguish from job-driven matches.
  const matchRow = await base44.entities.Match.create({
    student_email: pair.user_a_email,
    recruiter_email: pair.user_b_email,
    job_id: null,
    job_title: 'Connection',
    company: 'Direct connection',
    data: {
      kind: 'connection',
      peer_a_name: pair.user_a_name,
      peer_b_name: pair.user_b_name,
      peer_a_role: pair.user_a_role,
      peer_b_role: pair.user_b_role,
    },
  });

  return base44.entities.Connection.create({
    ...pair,
    initiated_by_email: swiperEmail,
    status: 'accepted',
    match_id: matchRow?.id ?? null,
    data: {
      kind: 'peer_connection',
    },
  });
};

/**
 * High-level right-swipe handler. Returns:
 *   { matched: true, connection } if both peers swiped right
 *   { matched: false } otherwise
 */
export const handleRightSwipe = async ({ swiper, target }) => {
  await recordSwipe({ swiper, target, direction: 'right' });
  const reciprocal = await findSwipe(target.email, swiper.email);
  if (reciprocal?.direction === 'right') {
    const connection = await createMutualConnection({ swiper, target });
    return { matched: true, connection };
  }
  return { matched: false };
};

export const handleLeftSwipe = async ({ swiper, target }) =>
  recordSwipe({ swiper, target, direction: 'left' });

/**
 * Accept a pending request (target accepts swiper's prior right swipe).
 * Symmetric with handleRightSwipe but with the inverted swiper/target.
 */
export const acceptPendingRequest = async ({ me, requester }) =>
  handleRightSwipe({ swiper: me, target: requester });
