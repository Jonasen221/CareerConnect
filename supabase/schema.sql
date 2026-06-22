-- =============================================================================
-- CareerConnect Supabase schema (Base44 migration)
--
-- Paste this into the Supabase SQL editor (or run with the Supabase CLI) after
-- creating your project. It is idempotent — running it again is safe.
--
-- Every domain table uses these common columns, matching the shim in
-- src/api/base44Client.js:
--   id           uuid primary key default gen_random_uuid()
--   created_by   text  (the creating user's email)
--   created_date timestamptz default now()
--   updated_date timestamptz default now()
--   data         jsonb default '{}'    (catch-all for fields the shim doesn't
--                                      know about — the shim auto-flattens this
--                                      back onto rows when reading)
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  role text not null default 'user',          -- 'user' | 'admin'
  photo_url text,
  resume_url text,
  intro_video_url text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;

drop policy if exists "profiles: read all" on public.profiles;
create policy "profiles: read all" on public.profiles
  for select using ( auth.role() = 'authenticated' );

drop policy if exists "profiles: self update" on public.profiles;
create policy "profiles: self update" on public.profiles
  for update using ( auth.uid() = id ) with check ( auth.uid() = id );

drop policy if exists "profiles: self insert" on public.profiles;
create policy "profiles: self insert" on public.profiles
  for insert with check ( auth.uid() = id );

-- -----------------------------------------------------------------------------
-- Domain tables
-- Only the columns used for filtering / querying need to be first-class columns.
-- Everything else is accepted by the API layer and stored in `data` jsonb.
-- -----------------------------------------------------------------------------

create table if not exists public.student_profiles (
  id uuid primary key default gen_random_uuid(),
  created_by text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  full_name text,
  email text,
  photo_url text,
  resume_url text,
  intro_video_url text,
  bio text,
  headline text,
  university text,
  major text,
  graduation_year int,
  graduation_month int,
  location text,
  nationality text,
  linkedin_url text,
  phone_number text,
  skills jsonb default '[]'::jsonb,
  languages jsonb default '[]'::jsonb,
  industries jsonb default '[]'::jsonb,
  work_preferences jsonb default '[]'::jsonb,
  education jsonb default '[]'::jsonb,
  experience jsonb default '[]'::jsonb,
  extracted_keywords jsonb,
  level int default 1,
  status text default 'pending',
  industry text,
  data jsonb default '{}'::jsonb
);

-- Backfill columns for older installations.
alter table public.student_profiles
  add column if not exists university text,
  add column if not exists major text,
  add column if not exists graduation_year int,
  add column if not exists graduation_month int,
  add column if not exists nationality text,
  add column if not exists linkedin_url text,
  add column if not exists phone_number text,
  add column if not exists languages jsonb default '[]'::jsonb,
  add column if not exists industries jsonb default '[]'::jsonb,
  add column if not exists work_preferences jsonb default '[]'::jsonb,
  add column if not exists extracted_keywords jsonb,
  add column if not exists education_level text,
  add column if not exists keywords jsonb default '[]'::jsonb,
  add column if not exists data jsonb default '{}'::jsonb;

create table if not exists public.recruiter_profiles (
  id uuid primary key default gen_random_uuid(),
  created_by text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  full_name text,
  email text,
  company text,
  role text,
  title text,
  photo_url text,
  company_logo_url text,
  company_website text,
  intro_video_url text,
  bio text,
  status text default 'pending',
  industry text,
  location text,
  phone_number text,
  is_contact_point boolean default false,
  data jsonb default '{}'::jsonb
);

alter table public.recruiter_profiles
  add column if not exists title text,
  add column if not exists company_website text,
  add column if not exists intro_video_url text,
  add column if not exists phone_number text,
  add column if not exists is_contact_point boolean default false,
  add column if not exists keywords jsonb default '[]'::jsonb,
  add column if not exists data jsonb default '{}'::jsonb;

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  created_by text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  title text,
  company text,
  description text,
  requirements text,
  location text,
  industry text,
  salary_range text,
  salary_min text,
  salary_max text,
  type text,                          -- matches `job.type` in the app
  required_skills jsonb default '[]'::jsonb,
  required_languages jsonb default '[]'::jsonb,
  perks jsonb default '[]'::jsonb,
  recruiter_video_url text,
  company_logo_url text,
  status text default 'active',
  data jsonb default '{}'::jsonb
);

alter table public.jobs
  add column if not exists type text,
  add column if not exists salary_min text,
  add column if not exists salary_max text,
  add column if not exists required_skills jsonb default '[]'::jsonb,
  add column if not exists required_languages jsonb default '[]'::jsonb,
  add column if not exists perks jsonb default '[]'::jsonb,
  add column if not exists recruiter_video_url text,
  add column if not exists company_logo_url text,
  add column if not exists keywords jsonb default '[]'::jsonb,
  add column if not exists data jsonb default '{}'::jsonb;
-- Migrate older installations that used `job_type` to `type`.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='jobs' and column_name='job_type'
  ) then
    update public.jobs set type = coalesce(type, job_type);
    alter table public.jobs drop column job_type;
  end if;
end $$;

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  created_by text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  student_email text,
  recruiter_email text,
  job_id uuid,
  job_title text,
  company text,
  data jsonb default '{}'::jsonb
);
alter table public.matches add column if not exists data jsonb default '{}'::jsonb;

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  created_by text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  match_id uuid,
  sender_email text,
  receiver_email text,
  content text,
  read boolean default false,
  data jsonb default '{}'::jsonb
);
alter table public.messages add column if not exists data jsonb default '{}'::jsonb;

create table if not exists public.call_requests (
  id uuid primary key default gen_random_uuid(),
  created_by text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  student_email text,
  recruiter_email text,
  recruiter_name text,
  company text,
  job_id uuid,
  job_title text,
  message text,
  meeting_link text,
  proposed_date text,
  proposed_time text,
  scheduled_date text,
  scheduled_time text,
  scheduled_at timestamptz,
  status text default 'pending',
  notes text,
  data jsonb default '{}'::jsonb
);
alter table public.call_requests
  add column if not exists recruiter_name text,
  add column if not exists company text,
  add column if not exists job_id uuid,
  add column if not exists job_title text,
  add column if not exists message text,
  add column if not exists meeting_link text,
  add column if not exists proposed_date text,
  add column if not exists proposed_time text,
  add column if not exists scheduled_date text,
  add column if not exists scheduled_time text;

create table if not exists public.swipes (
  id uuid primary key default gen_random_uuid(),
  created_by text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  job_id uuid,
  direction text,
  data jsonb default '{}'::jsonb
);
alter table public.swipes add column if not exists data jsonb default '{}'::jsonb;

create table if not exists public.shortlists (
  id uuid primary key default gen_random_uuid(),
  created_by text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  student_email text,
  job_id uuid,
  data jsonb default '{}'::jsonb
);
alter table public.shortlists add column if not exists data jsonb default '{}'::jsonb;

create table if not exists public.interview_slots (
  id uuid primary key default gen_random_uuid(),
  created_by text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  recruiter_email text,
  recruiter_name text,
  company text,
  job_id uuid,
  job_title text,
  date text,
  time text,
  duration_minutes int,
  location_type text,
  meeting_link text,
  notes text,
  start_at timestamptz,
  end_at timestamptz,
  status text default 'available',
  data jsonb default '{}'::jsonb
);
alter table public.interview_slots
  add column if not exists recruiter_name text,
  add column if not exists company text,
  add column if not exists job_title text,
  add column if not exists date text,
  add column if not exists time text,
  add column if not exists duration_minutes int,
  add column if not exists location_type text,
  add column if not exists meeting_link text,
  add column if not exists notes text,
  add column if not exists data jsonb default '{}'::jsonb;

create table if not exists public.interview_requests (
  id uuid primary key default gen_random_uuid(),
  created_by text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  student_email text,
  student_name text,
  recruiter_email text,
  recruiter_name text,
  company text,
  job_id uuid,
  job_title text,
  message text,
  slot_ids jsonb default '[]'::jsonb,
  status text default 'pending',
  accepted_slot_id uuid,
  data jsonb default '{}'::jsonb
);
alter table public.interview_requests
  add column if not exists student_name text,
  add column if not exists recruiter_name text,
  add column if not exists company text,
  add column if not exists job_title text,
  add column if not exists message text,
  add column if not exists slot_ids jsonb default '[]'::jsonb,
  add column if not exists data jsonb default '{}'::jsonb;

create table if not exists public.interview_bookings (
  id uuid primary key default gen_random_uuid(),
  created_by text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  slot_id uuid,
  student_email text,
  student_name text,
  recruiter_email text,
  company text,
  job_id uuid,
  job_title text,
  date text,
  time text,
  duration_minutes int,
  location_type text,
  meeting_link text,
  status text default 'confirmed',
  data jsonb default '{}'::jsonb
);
alter table public.interview_bookings
  add column if not exists student_name text,
  add column if not exists company text,
  add column if not exists job_title text,
  add column if not exists date text,
  add column if not exists time text,
  add column if not exists duration_minutes int,
  add column if not exists location_type text,
  add column if not exists meeting_link text,
  add column if not exists data jsonb default '{}'::jsonb;

create table if not exists public.game_progress (
  id uuid primary key default gen_random_uuid(),
  created_by text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  total_xp int default 0,
  credits int default 0,
  streak_days int default 0,
  level int default 1,
  completed_games jsonb default '[]'::jsonb,
  last_played_date timestamptz,
  data jsonb default '{}'::jsonb
);
alter table public.game_progress add column if not exists data jsonb default '{}'::jsonb;

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  created_by text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  tier text,
  status text default 'active',
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  data jsonb default '{}'::jsonb
);
alter table public.subscriptions add column if not exists data jsonb default '{}'::jsonb;

create table if not exists public.credit_redemptions (
  id uuid primary key default gen_random_uuid(),
  created_by text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  service_type text,
  credits_spent int,
  reward text,
  cost int,
  data jsonb default '{}'::jsonb
);
alter table public.credit_redemptions
  add column if not exists service_type text,
  add column if not exists credits_spent int;

create table if not exists public.service_bookings (
  id uuid primary key default gen_random_uuid(),
  created_by text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  service text,
  service_type text,
  credits_spent int,
  status text default 'pending',
  scheduled_at timestamptz,
  data jsonb default '{}'::jsonb
);
alter table public.service_bookings
  add column if not exists service_type text,
  add column if not exists credits_spent int;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  created_by text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  title text,
  description text,
  date timestamptz,
  location text,
  banner_url text,
  type text,
  link text,
  data jsonb default '{}'::jsonb
);
alter table public.events
  add column if not exists type text,
  add column if not exists link text;

create table if not exists public.event_rsvps (
  id uuid primary key default gen_random_uuid(),
  created_by text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  event_id uuid,
  status text default 'going',
  data jsonb default '{}'::jsonb
);
alter table public.event_rsvps add column if not exists data jsonb default '{}'::jsonb;

create table if not exists public.event_invites (
  id uuid primary key default gen_random_uuid(),
  created_by text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  event_id uuid,
  student_email text,
  status text default 'pending',
  data jsonb default '{}'::jsonb
);
alter table public.event_invites add column if not exists data jsonb default '{}'::jsonb;

-- -----------------------------------------------------------------------------
-- Projects (user-posted, company-posted, and student portfolio items)
-- -----------------------------------------------------------------------------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  created_by text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  title text,
  description text,
  -- kind: 'user' (any user posts an open collab), 'company' (recruiter/firm
  -- challenge or hackathon), 'portfolio' (past work attached to a profile)
  kind text not null default 'user',
  owner_role text,
  status text default 'open',
  -- target_audience only relevant for company-posted projects.
  -- null = no specific targeting.
  target_audience text,
  needed_skills jsonb default '[]'::jsonb,
  keywords jsonb default '[]'::jsonb,
  link_url text,
  media_url text,
  owner_profile_id uuid,
  data jsonb default '{}'::jsonb
);
alter table public.projects
  add column if not exists kind text not null default 'user',
  add column if not exists owner_role text,
  add column if not exists target_audience text,
  add column if not exists needed_skills jsonb default '[]'::jsonb,
  add column if not exists keywords jsonb default '[]'::jsonb,
  add column if not exists link_url text,
  add column if not exists media_url text,
  add column if not exists owner_profile_id uuid,
  add column if not exists data jsonb default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'projects_kind_check'
  ) then
    alter table public.projects
      add constraint projects_kind_check
      check (kind in ('user', 'company', 'portfolio'));
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'projects_target_audience_check'
  ) then
    alter table public.projects
      add constraint projects_target_audience_check
      check (target_audience is null or target_audience in ('high_school', 'university', 'both'));
  end if;
end $$;

create table if not exists public.project_interests (
  id uuid primary key default gen_random_uuid(),
  created_by text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  project_id uuid,
  user_email text,
  note text,
  data jsonb default '{}'::jsonb
);
alter table public.project_interests
  add column if not exists note text,
  add column if not exists data jsonb default '{}'::jsonb;

-- -----------------------------------------------------------------------------
-- Row Level Security — permissive MVP defaults
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
  tables text[] := array[
    'student_profiles',
    'recruiter_profiles',
    'jobs',
    'matches',
    'messages',
    'call_requests',
    'swipes',
    'shortlists',
    'interview_slots',
    'interview_requests',
    'interview_bookings',
    'game_progress',
    'subscriptions',
    'credit_redemptions',
    'service_bookings',
    'events',
    'event_rsvps',
    'event_invites',
    'projects',
    'project_interests'
  ];
begin
  foreach t in array tables loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "%I: auth all" on public.%I;', t, t);
    execute format(
      'create policy "%I: auth all" on public.%I for all to authenticated using (true) with check (true);',
      t, t
    );
  end loop;
end $$;

-- Public read (anon) for the marketing Home page: active jobs, approved counts
drop policy if exists "jobs: anon select active" on public.jobs;
create policy "jobs: anon select active" on public.jobs
  for select to anon
  using ( coalesce(status, 'active') = 'active' );

drop policy if exists "student_profiles: anon select approved" on public.student_profiles;
create policy "student_profiles: anon select approved" on public.student_profiles
  for select to anon
  using ( status = 'approved' );

drop policy if exists "recruiter_profiles: anon select approved" on public.recruiter_profiles;
create policy "recruiter_profiles: anon select approved" on public.recruiter_profiles
  for select to anon
  using ( status = 'approved' );

drop policy if exists "projects: anon select open" on public.projects;
create policy "projects: anon select open" on public.projects
  for select to anon
  using ( coalesce(status, 'open') = 'open' );

-- -----------------------------------------------------------------------------
-- Storage: public `uploads` bucket for UploadFile()
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', true)
on conflict (id) do nothing;

drop policy if exists "uploads: public read" on storage.objects;
create policy "uploads: public read" on storage.objects
  for select using ( bucket_id = 'uploads' );

drop policy if exists "uploads: auth write" on storage.objects;
create policy "uploads: auth write" on storage.objects
  for insert to authenticated with check ( bucket_id = 'uploads' );

drop policy if exists "uploads: owner modify" on storage.objects;
create policy "uploads: owner modify" on storage.objects
  for update to authenticated using ( bucket_id = 'uploads' and owner = auth.uid() );

drop policy if exists "uploads: owner delete" on storage.objects;
create policy "uploads: owner delete" on storage.objects
  for delete to authenticated using ( bucket_id = 'uploads' and owner = auth.uid() );

-- -----------------------------------------------------------------------------
-- Helpful indexes
-- -----------------------------------------------------------------------------
create index if not exists idx_student_profiles_created_by on public.student_profiles (created_by);
create index if not exists idx_recruiter_profiles_created_by on public.recruiter_profiles (created_by);
create index if not exists idx_jobs_created_by on public.jobs (created_by);
create index if not exists idx_jobs_status on public.jobs (status);
create index if not exists idx_matches_student on public.matches (student_email);
create index if not exists idx_matches_recruiter on public.matches (recruiter_email);
create index if not exists idx_messages_receiver on public.messages (receiver_email);
create index if not exists idx_swipes_job on public.swipes (job_id);
create index if not exists idx_swipes_created_by on public.swipes (created_by);
create index if not exists idx_shortlists_student on public.shortlists (student_email);
create index if not exists idx_interview_slots_recruiter on public.interview_slots (recruiter_email);
create index if not exists idx_interview_requests_student on public.interview_requests (student_email);
create index if not exists idx_interview_bookings_student on public.interview_bookings (student_email);
create index if not exists idx_call_requests_student on public.call_requests (student_email);
create index if not exists idx_event_invites_student on public.event_invites (student_email);
create index if not exists idx_projects_kind on public.projects (kind);
create index if not exists idx_projects_status on public.projects (status);
create index if not exists idx_projects_created_by on public.projects (created_by);
create index if not exists idx_project_interests_project on public.project_interests (project_id);
create index if not exists idx_project_interests_user on public.project_interests (user_email);
