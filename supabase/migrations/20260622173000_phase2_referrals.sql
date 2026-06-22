-- =============================================================================
-- Phase 2 / Feature 6: Recruiter Referral Links + Offer Events
-- =============================================================================
-- Adds the data model for outbound recruiter share links and inbound platform-
-- attributed offer tracking:
--
--   * referral_links: one row per (recruiter, target) share link. The `code`
--     is the public URL slug used in /r/:code. Denormalized counters keep the
--     analytics panel cheap to render.
--   * referral_clicks: append-only row per visit to /r/:code so we can audit
--     traffic. Anonymous clicks have null email but a fingerprint.
--   * referral_signups: written when a new account is created after clicking
--     a referral link (attribution).
--   * offer_events: recruiter-logged offers (platform-attributed when the
--     recruiter declares it so), drives the "platform-assisted hires" metric.
--
-- The public /r/:code preview requires anon SELECT on referral_links AND
-- anon INSERT on referral_clicks so a logged-out visitor can land + be
-- counted. Everything else stays authenticated-only.
-- =============================================================================

-- --- referral_links ----------------------------------------------------------
create table if not exists public.referral_links (
  id uuid primary key default gen_random_uuid(),
  created_by text,                       -- recruiter email
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  recruiter_email text not null,
  recruiter_name text,
  company text,
  target_type text not null check (target_type in ('job', 'project', 'profile')),
  target_id uuid,
  target_label text,                     -- denormalized title for previews
  target_summary text,                   -- denormalized short description
  code text not null unique,             -- public URL slug
  label text,                            -- recruiter-facing label (e.g. 'LinkedIn DM')
  is_active boolean not null default true,
  total_clicks integer not null default 0,
  total_signups integer not null default 0,
  total_offers integer not null default 0,
  data jsonb default '{}'::jsonb
);

create index if not exists idx_referral_links_recruiter
  on public.referral_links (recruiter_email);
create index if not exists idx_referral_links_target
  on public.referral_links (target_type, target_id);
create index if not exists idx_referral_links_code
  on public.referral_links (code);

-- --- referral_clicks ---------------------------------------------------------
create table if not exists public.referral_clicks (
  id uuid primary key default gen_random_uuid(),
  created_by text,
  created_date timestamptz not null default now(),
  link_id uuid references public.referral_links(id) on delete cascade,
  link_code text,
  visitor_email text,                    -- null when logged out
  visitor_fingerprint text,              -- best-effort dedupe handle
  referrer text,
  user_agent text,
  data jsonb default '{}'::jsonb
);

create index if not exists idx_referral_clicks_link
  on public.referral_clicks (link_id, created_date desc);
create index if not exists idx_referral_clicks_visitor
  on public.referral_clicks (visitor_email);

-- --- referral_signups --------------------------------------------------------
create table if not exists public.referral_signups (
  id uuid primary key default gen_random_uuid(),
  created_by text,
  created_date timestamptz not null default now(),
  link_id uuid references public.referral_links(id) on delete set null,
  link_code text,
  signup_email text not null,
  signup_role text,                      -- 'student' | 'recruiter' | null
  data jsonb default '{}'::jsonb
);

create unique index if not exists referral_signups_email_link_uniq
  on public.referral_signups (signup_email, link_code);

create index if not exists idx_referral_signups_link
  on public.referral_signups (link_id);

-- --- offer_events ------------------------------------------------------------
create table if not exists public.offer_events (
  id uuid primary key default gen_random_uuid(),
  created_by text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  recruiter_email text not null,
  recruiter_name text,
  company text,
  candidate_email text,
  candidate_name text,
  target_type text check (target_type in ('job', 'project', 'other')),
  target_id uuid,
  target_label text,
  offer_summary text,                    -- free-text (salary, role, etc.)
  status text not null default 'sent'    -- 'sent' | 'accepted' | 'declined' | 'withdrawn'
    check (status in ('sent', 'accepted', 'declined', 'withdrawn')),
  platform_attributed boolean not null default true,
  attributed_link_id uuid references public.referral_links(id) on delete set null,
  attributed_link_code text,
  decision_date timestamptz,
  notes text,
  data jsonb default '{}'::jsonb
);

create index if not exists idx_offer_events_recruiter
  on public.offer_events (recruiter_email);
create index if not exists idx_offer_events_candidate
  on public.offer_events (candidate_email);
create index if not exists idx_offer_events_status
  on public.offer_events (status);
create index if not exists idx_offer_events_link
  on public.offer_events (attributed_link_id);

-- --- RLS ---------------------------------------------------------------------
alter table public.referral_links enable row level security;
drop policy if exists "referral_links: auth all" on public.referral_links;
create policy "referral_links: auth all" on public.referral_links
  for all to authenticated using (true) with check (true);

-- Anonymous read access for the public /r/:code landing preview. We
-- intentionally allow any active link to be selected by code so the
-- preview can render. Hiding cards (target_summary, target_label) is the
-- recruiter's call when they create the link.
drop policy if exists "referral_links: anon select active" on public.referral_links;
create policy "referral_links: anon select active" on public.referral_links
  for select to anon using (is_active = true);

alter table public.referral_clicks enable row level security;
drop policy if exists "referral_clicks: auth all" on public.referral_clicks;
create policy "referral_clicks: auth all" on public.referral_clicks
  for all to authenticated using (true) with check (true);

-- Anonymous insert for the public landing preview to record the click.
drop policy if exists "referral_clicks: anon insert" on public.referral_clicks;
create policy "referral_clicks: anon insert" on public.referral_clicks
  for insert to anon with check (true);

alter table public.referral_signups enable row level security;
drop policy if exists "referral_signups: auth all" on public.referral_signups;
create policy "referral_signups: auth all" on public.referral_signups
  for all to authenticated using (true) with check (true);

alter table public.offer_events enable row level security;
drop policy if exists "offer_events: auth all" on public.offer_events;
create policy "offer_events: auth all" on public.offer_events
  for all to authenticated using (true) with check (true);
