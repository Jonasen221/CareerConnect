/**
 * Supabase-backed compatibility shim for the former Base44 SDK.
 *
 * The rest of the codebase was originally written against `@base44/sdk` and
 * calls things like:
 *   base44.auth.me()
 *   base44.entities.StudentProfile.filter({ created_by: email })
 *   base44.integrations.Core.UploadFile({ file })
 *   base44.functions.invoke('addToGoogleCalendar', payload)
 *
 * Rewriting every page/component was not desired, so this module preserves the
 * exact same surface while delegating to Supabase under the hood. If you want
 * to migrate a call site to native `supabase.from(...)` queries, it's safe to
 * do so incrementally; this shim will keep the untouched call sites working.
 *
 * Configuration: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see
 * .env.example and README).
 */

import { supabase } from '@/lib/supabaseClient';

// ---------------------------------------------------------------------------
// Entity name -> Supabase table name
// ---------------------------------------------------------------------------
// Keep these aligned with supabase/schema.sql.
const ENTITY_TABLES = {
  StudentProfile: 'student_profiles',
  RecruiterProfile: 'recruiter_profiles',
  Job: 'jobs',
  Match: 'matches',
  Message: 'messages',
  CallRequest: 'call_requests',
  Swipe: 'swipes',
  Shortlist: 'shortlists',
  InterviewBooking: 'interview_bookings',
  InterviewRequest: 'interview_requests',
  InterviewSlot: 'interview_slots',
  GameProgress: 'game_progress',
  Subscription: 'subscriptions',
  CreditRedemption: 'credit_redemptions',
  ServiceBooking: 'service_bookings',
  Event: 'events',
  EventRSVP: 'event_rsvps',
  EventInvite: 'event_invites',
  Project: 'projects',
  ProjectInterest: 'project_interests',
  AppSettings: 'app_settings',
  AdminAction: 'admin_actions',
  // "User" in the old admin UI was really the auth user list. We route it to
  // the profiles table (one row per auth user), which is where role / metadata
  // live in the Supabase schema.
  User: 'profiles',
};

// ---------------------------------------------------------------------------
// Per-table column allowlist
// ---------------------------------------------------------------------------
// Any field sent to .create()/.update() that's NOT in this list gets merged
// into the table's `data` jsonb column instead — so the shim stays tolerant
// of fields the schema doesn't explicitly model. On reads, `data` is
// flattened back onto the row.
//
// Keep this in sync with supabase/schema.sql. If you add a new column, add it
// here too (otherwise the shim will silently route it to `data`, which still
// works but isn't queryable).
const COMMON = ['id', 'created_by', 'created_date', 'updated_date', 'data'];

const TABLE_COLUMNS = {
  student_profiles: [
    ...COMMON, 'full_name', 'email', 'photo_url', 'resume_url',
    'intro_video_url', 'bio', 'headline', 'university', 'major',
    'graduation_year', 'graduation_month', 'location', 'nationality',
    'linkedin_url', 'phone_number', 'skills', 'languages', 'industries',
    'work_preferences', 'education', 'experience', 'extracted_keywords',
    'education_level', 'keywords',
    'level', 'status', 'industry',
    'flagged', 'internal_notes', 'suspension_reason', 'verified_student',
    'notification_message',
  ],
  recruiter_profiles: [
    ...COMMON, 'full_name', 'email', 'company', 'role', 'title', 'photo_url',
    'company_logo_url', 'company_website', 'intro_video_url', 'bio', 'status',
    'industry', 'location', 'phone_number', 'is_contact_point', 'keywords',
    'flagged', 'internal_notes', 'suspension_reason', 'notification_message',
  ],
  jobs: [
    ...COMMON, 'title', 'company', 'description', 'requirements', 'location',
    'industry', 'salary_range', 'salary_min', 'salary_max', 'type',
    'required_skills', 'required_languages', 'perks', 'recruiter_video_url',
    'company_logo_url', 'status', 'keywords',
  ],
  matches: [
    ...COMMON, 'student_email', 'recruiter_email', 'job_id', 'job_title',
    'company',
  ],
  messages: [
    ...COMMON, 'match_id', 'sender_email', 'receiver_email', 'content', 'read',
  ],
  call_requests: [
    ...COMMON, 'student_email', 'recruiter_email', 'recruiter_name', 'company',
    'job_id', 'job_title', 'message', 'meeting_link', 'proposed_date',
    'proposed_time', 'scheduled_date', 'scheduled_time', 'scheduled_at',
    'status', 'notes',
  ],
  swipes: [...COMMON, 'job_id', 'direction'],
  shortlists: [...COMMON, 'student_email', 'job_id'],
  interview_slots: [
    ...COMMON, 'recruiter_email', 'recruiter_name', 'company', 'job_id',
    'job_title', 'date', 'time', 'duration_minutes', 'location_type',
    'meeting_link', 'notes', 'start_at', 'end_at', 'status',
  ],
  interview_requests: [
    ...COMMON, 'student_email', 'student_name', 'recruiter_email',
    'recruiter_name', 'company', 'job_id', 'job_title', 'message', 'slot_ids',
    'status', 'accepted_slot_id',
  ],
  interview_bookings: [
    ...COMMON, 'slot_id', 'student_email', 'student_name', 'recruiter_email',
    'company', 'job_id', 'job_title', 'date', 'time', 'duration_minutes',
    'location_type', 'meeting_link', 'status',
  ],
  game_progress: [
    ...COMMON, 'total_xp', 'credits', 'streak_days', 'level',
    'completed_games', 'last_played_date',
  ],
  subscriptions: [
    ...COMMON, 'tier', 'status', 'stripe_customer_id',
    'stripe_subscription_id', 'current_period_end',
  ],
  credit_redemptions: [...COMMON, 'service_type', 'credits_spent', 'reward', 'cost'],
  service_bookings: [
    ...COMMON, 'service', 'service_type', 'credits_spent', 'status',
    'scheduled_at',
  ],
  events: [
    ...COMMON, 'title', 'description', 'date', 'location', 'banner_url',
    'type', 'link',
  ],
  event_rsvps: [...COMMON, 'event_id', 'status'],
  event_invites: [...COMMON, 'event_id', 'student_email', 'status'],
  projects: [
    ...COMMON, 'title', 'description', 'kind', 'owner_role', 'status',
    'target_audience', 'needed_skills', 'keywords', 'link_url', 'media_url',
    'owner_profile_id',
  ],
  project_interests: [
    ...COMMON, 'project_id', 'user_email', 'note',
  ],
  app_settings: [
    'id', 'created_date', 'updated_date', 'singleton',
    'moderation_students', 'moderation_recruiters',
    'trusted_student_email_domains', 'log_admin_page_views', 'data',
  ],
  admin_actions: [
    'id', 'created_date', 'admin_id', 'admin_email', 'action',
    'target_type', 'target_id', 'target_label', 'reason', 'notes', 'metadata',
  ],
  profiles: [
    'id', 'email', 'full_name', 'role', 'photo_url', 'resume_url',
    'intro_video_url', 'created_date', 'updated_date',
  ],
};

const hasDataColumn = (table) =>
  TABLE_COLUMNS[table]?.includes('data') ?? false;

// Split an incoming payload into { known, extra } — known fields stay at the
// top level, extras get merged into the `data` jsonb column (if the table
// has one; otherwise they're dropped with a console warning).
const splitPayload = (table, payload) => {
  const cols = TABLE_COLUMNS[table];
  if (!cols) return { known: payload, extra: {} };
  const allowed = new Set(cols);
  const known = {};
  const extra = {};
  for (const [k, v] of Object.entries(payload ?? {})) {
    if (k === 'data') continue;
    if (allowed.has(k)) known[k] = v;
    else extra[k] = v;
  }
  return { known, extra };
};

// Flatten `data` jsonb onto rows on reads so callers see a single flat object.
// Top-level columns always win over `data` keys of the same name.
const flattenRow = (row) => {
  if (!row || typeof row !== 'object') return row;
  const { data, ...rest } = row;
  if (data && typeof data === 'object') {
    return { ...data, ...rest };
  }
  return rest;
};
const flattenRows = (rows) => (Array.isArray(rows) ? rows.map(flattenRow) : rows);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const parseOrder = (sort) => {
  if (!sort) return { column: 'created_date', ascending: false };
  const descending = sort.startsWith('-');
  const column = descending ? sort.slice(1) : sort;
  return { column, ascending: !descending };
};

const getCurrentEmail = async () => {
  const { data } = await supabase.auth.getUser();
  return data?.user?.email ?? null;
};

const unwrap = ({ data, error }) => {
  if (error) throw error;
  return data;
};

// Build a single entity "repository" that mimics the Base44 Entity surface.
const makeEntity = (table) => ({
  /**
   * list(sort?, limit?) -> Row[]
   *   sort: 'field' (asc) or '-field' (desc). Defaults to '-created_date'.
   */
  async list(sort, limit) {
    const { column, ascending } = parseOrder(sort);
    let q = supabase.from(table).select('*').order(column, { ascending });
    if (typeof limit === 'number') q = q.limit(limit);
    return flattenRows(unwrap(await q));
  },

  /**
   * filter({ field: value, ... }, sort?, limit?) -> Row[]
   * All filters are equality matches (matches Base44 behaviour).
   */
  async filter(where = {}, sort, limit) {
    const { column, ascending } = parseOrder(sort);
    let q = supabase.from(table).select('*');
    const cols = TABLE_COLUMNS[table];
    for (const [k, v] of Object.entries(where)) {
      // If the filter key isn't a real column but the table has a `data`
      // jsonb, fall back to querying the jsonb. Equality only — matches the
      // Base44 contract.
      if (cols && !cols.includes(k) && hasDataColumn(table)) {
        q = q.eq(`data->>${k}`, String(v));
      } else {
        q = q.eq(k, v);
      }
    }
    q = q.order(column, { ascending });
    if (typeof limit === 'number') q = q.limit(limit);
    return flattenRows(unwrap(await q));
  },

  /**
   * get(id) -> Row | null
   */
  async get(id) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return flattenRow(data);
  },

  /**
   * create(payload) -> Row
   * Auto-fills created_by from the current authenticated user's email (to
   * match Base44's behaviour where most tables were filtered by created_by).
   * Fields not in the table's column allowlist are merged into `data`.
   */
  async create(payload) {
    const email = await getCurrentEmail();
    const now = new Date().toISOString();
    const flat = {
      created_by: email,
      created_date: now,
      updated_date: now,
      ...payload,
    };
    const { known, extra } = splitPayload(table, flat);
    const row = { ...known };
    if (Object.keys(extra).length > 0) {
      if (hasDataColumn(table)) {
        row.data = extra;
      } else if (typeof console !== 'undefined') {
        // eslint-disable-next-line no-console
        console.warn(
          `[base44Client] Dropped unknown fields on ${table}:`,
          Object.keys(extra)
        );
      }
    }
    const { data, error } = await supabase
      .from(table)
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return flattenRow(data);
  },

  /**
   * update(id, patch) -> Row
   * Unknown fields are merged into the existing `data` jsonb rather than
   * overwriting it.
   */
  async update(id, patch) {
    const { known, extra } = splitPayload(table, patch ?? {});
    const updates = { ...known, updated_date: new Date().toISOString() };
    if (Object.keys(extra).length > 0) {
      if (hasDataColumn(table)) {
        // Merge with existing data so we don't clobber other keys.
        const existing = await supabase
          .from(table)
          .select('data')
          .eq('id', id)
          .maybeSingle();
        const base = existing?.data?.data ?? {};
        updates.data = { ...base, ...extra };
      } else if (typeof console !== 'undefined') {
        // eslint-disable-next-line no-console
        console.warn(
          `[base44Client] Dropped unknown fields on ${table} update:`,
          Object.keys(extra)
        );
      }
    }
    const { data, error } = await supabase
      .from(table)
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return flattenRow(data);
  },

  /**
   * delete(id) -> void
   */
  async delete(id) {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw error;
  },
});

const entities = Object.fromEntries(
  Object.entries(ENTITY_TABLES).map(([name, table]) => [name, makeEntity(table)])
);

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

// Merge auth.user + profiles row into the flat shape the rest of the app expects
// (full_name, role, photo_url, resume_url, intro_video_url, email, id).
const hydrateUser = async (authUser) => {
  if (!authUser) return null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle();

  return {
    id: authUser.id,
    email: authUser.email,
    full_name: profile?.full_name ?? authUser.user_metadata?.full_name ?? '',
    role: profile?.role ?? 'user',
    photo_url: profile?.photo_url ?? null,
    resume_url: profile?.resume_url ?? null,
    intro_video_url: profile?.intro_video_url ?? null,
    ...profile,
    email: authUser.email, // ensure email from auth wins
    id: authUser.id,
  };
};

const auth = {
  async me() {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      const err = new Error(error.message);
      err.status = 401;
      throw err;
    }
    const user = data?.user;
    if (!user) {
      const err = new Error('Not authenticated');
      err.status = 401;
      throw err;
    }
    return hydrateUser(user);
  },

  async isAuthenticated() {
    const { data } = await supabase.auth.getSession();
    return !!data?.session;
  },

  async logout(redirectUrl) {
    await supabase.auth.signOut();
    if (typeof window !== 'undefined') {
      window.location.href =
        typeof redirectUrl === 'string' ? redirectUrl : '/login';
    }
  },

  redirectToLogin(returnUrl) {
    if (typeof window === 'undefined') return;
    const path = window.location.pathname || '';
    // Avoid redirect loops / ever-growing ?next= chains when already on auth screens.
    if (path === '/login' || path === '/signup') return;
    const target = new URL('/login', window.location.origin);
    const back = typeof returnUrl === 'string' ? returnUrl : window.location.href;
    try {
      const backUrl = new URL(back, window.location.origin);
      if (backUrl.pathname === '/login' || backUrl.pathname === '/signup') return;
    } catch {
      /* ignore invalid next */
    }
    target.searchParams.set('next', back);
    window.location.href = target.toString();
  },

  /**
   * updateMe(patch) -> upserts the current user's profile row.
   */
  async updateMe(patch) {
    const { data } = await supabase.auth.getUser();
    const user = data?.user;
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('profiles')
      .upsert(
        {
          id: user.id,
          email: user.email,
          ...patch,
          updated_date: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
    if (error) throw error;
    return hydrateUser(user);
  },
};

// ---------------------------------------------------------------------------
// Integrations (file upload + AI helpers)
// ---------------------------------------------------------------------------

const UPLOAD_BUCKET = 'uploads';

const integrations = {
  Core: {
    /**
     * UploadFile({ file }) -> { file_url }
     * Uploads to the Supabase Storage `uploads` bucket (public-read). Make sure
     * the bucket exists and has an anon-readable policy (see schema.sql).
     */
    async UploadFile({ file }) {
      if (!file) throw new Error('UploadFile: file is required');
      const email = await getCurrentEmail();
      const safeName = (file.name || 'upload').replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${email ?? 'anon'}/${Date.now()}-${safeName}`;

      const { error } = await supabase.storage
        .from(UPLOAD_BUCKET)
        .upload(path, file, {
          contentType: file.type || 'application/octet-stream',
          upsert: false,
        });
      if (error) throw error;

      const { data } = supabase.storage.from(UPLOAD_BUCKET).getPublicUrl(path);
      return { file_url: data.publicUrl, path };
    },

    /**
     * InvokeLLM({ prompt, response_json_schema?, ... })
     *
     * Base44 provided a hosted LLM. Supabase does not. Wire this up to whichever
     * provider you prefer (OpenAI, Anthropic, etc.) - the recommended path is
     * a Supabase Edge Function named `invoke-llm` that keeps your API key off
     * the client. The call below will route there if you create it.
     */
    async InvokeLLM(payload) {
      const { data, error } = await supabase.functions.invoke('invoke-llm', {
        body: payload,
      });
      if (error) {
         
        console.warn(
          '[InvokeLLM] Supabase edge function `invoke-llm` is not deployed. ' +
            'Returning empty result. See README for setup.'
        );
        return {};
      }
      return data ?? {};
    },

    /**
     * ExtractDataFromUploadedFile({ file_url, json_schema })
     *
     * Same story as InvokeLLM: Base44 had this built in; with Supabase you
     * deploy an edge function `extract-data` that pulls the file and runs
     * your extractor of choice.
     */
    async ExtractDataFromUploadedFile(payload) {
      const { data, error } = await supabase.functions.invoke('extract-data', {
        body: payload,
      });
      if (error) {
         
        console.warn(
          '[ExtractDataFromUploadedFile] Supabase edge function `extract-data` ' +
            'is not deployed. Returning empty result. See README for setup.'
        );
        return { status: 'error', output: null };
      }
      return data ?? { status: 'error', output: null };
    },
  },
};

// ---------------------------------------------------------------------------
// Functions (Base44 serverless -> Supabase Edge Functions)
// ---------------------------------------------------------------------------

const functions = {
  /**
   * invoke(name, payload)
   *
   * Ports to `supabase.functions.invoke`. The old Base44 functions (see
   * ./base44/functions/*) need to be re-implemented as Supabase Edge Functions
   * under `supabase/functions/<name>/index.ts`. The existing TypeScript entry
   * points are kept as references for porting.
   */
  async invoke(name, payload) {
    const { data, error } = await supabase.functions.invoke(name, {
      body: payload,
    });
    if (error) throw error;
    return data;
  },
};

// ---------------------------------------------------------------------------
// App logs (no-op: Base44 provided usage logging out of the box)
// ---------------------------------------------------------------------------

const appLogs = {
  async logUserInApp() {
    // no-op; implement as an analytics call if you want usage tracking.
  },
};

// ---------------------------------------------------------------------------
// Exported shim
// ---------------------------------------------------------------------------

export const base44 = {
  auth,
  entities,
  integrations,
  functions,
  appLogs,
};

export default base44;
