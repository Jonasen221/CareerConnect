-- =============================================================================
-- Phase 2 polish (Franzi's Jun 29 wishlist)
--   * student_profiles.degree_level — explicit qualification picker on profile
--   * coaching_requests — inquiry table powering the "1:1 coaching" CTA that
--     used to 404 on /ServicesBooking. Inquiry-only flow: candidate submits a
--     request, the admin Candidate Control panel surfaces it for follow-up.
--
-- intro_video_url and linkedin_url already exist on student_profiles (see the
-- 20260420 init migration) so they don't need a column add — only the UI was
-- missing.
-- =============================================================================

alter table public.student_profiles
  add column if not exists degree_level text;

create table if not exists public.coaching_requests (
  id uuid primary key default gen_random_uuid(),
  created_by text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  requester_email text not null,
  requester_name text,
  requester_role text,                       -- 'student' | 'recruiter' | null
  topic text,                                -- short description of what they need
  details text,                              -- long-form context from the requester
  preferred_times text,                      -- free text: "weekdays after 5pm UK"
  package text,                              -- 'single_session' | 'package_4' | etc. (free text for now)
  status text not null default 'new'
    check (status in ('new', 'contacted', 'scheduled', 'completed', 'closed')),
  admin_notes text,
  contacted_at timestamptz,
  resolved_at timestamptz,
  data jsonb default '{}'::jsonb
);

create index if not exists idx_coaching_requests_email
  on public.coaching_requests (requester_email);
create index if not exists idx_coaching_requests_status
  on public.coaching_requests (status);
create index if not exists idx_coaching_requests_created
  on public.coaching_requests (created_date desc);

alter table public.coaching_requests enable row level security;

-- Any authenticated user can submit a request; the row's `created_by` ties it
-- to their email so we don't need per-row read scoping in MVP. Admins read all
-- via the auth-all policy below; later we can tighten with is_admin().
drop policy if exists "coaching_requests: auth all" on public.coaching_requests;
create policy "coaching_requests: auth all" on public.coaching_requests
  for all to authenticated using (true) with check (true);
