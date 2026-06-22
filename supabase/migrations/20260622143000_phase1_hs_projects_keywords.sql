-- =============================================================================
-- Phase 1: High-school user type, Projects feature, Keyword tagging.
-- =============================================================================
-- Adds:
--   * education_level + keywords on student_profiles
--   * keywords on recruiter_profiles and jobs
--   * projects table (user / company / portfolio kinds)
--   * project_interests table
--   * RLS for the two new tables (matches the permissive MVP loop pattern)
--   * anon SELECT for open projects (Home/marketing visibility)
--   * helpful indexes
-- =============================================================================

-- --- student_profiles ---------------------------------------------------------
alter table public.student_profiles
  add column if not exists education_level text,
  add column if not exists keywords jsonb default '[]'::jsonb;

-- --- recruiter_profiles -------------------------------------------------------
alter table public.recruiter_profiles
  add column if not exists keywords jsonb default '[]'::jsonb;

-- --- jobs ---------------------------------------------------------------------
alter table public.jobs
  add column if not exists keywords jsonb default '[]'::jsonb;

-- --- projects -----------------------------------------------------------------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  created_by text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  title text,
  description text,
  kind text not null default 'user',
  owner_role text,
  status text default 'open',
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

-- --- project_interests --------------------------------------------------------
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

-- --- RLS (mirrors the permissive MVP "auth all" pattern) ----------------------
do $$
declare
  t text;
  tables text[] := array['projects', 'project_interests'];
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

-- Anon read for open projects (so the marketing home / public landing can
-- preview them later without needing auth).
drop policy if exists "projects: anon select open" on public.projects;
create policy "projects: anon select open" on public.projects
  for select to anon
  using ( coalesce(status, 'open') = 'open' );

-- --- indexes ------------------------------------------------------------------
create index if not exists idx_projects_kind on public.projects (kind);
create index if not exists idx_projects_status on public.projects (status);
create index if not exists idx_projects_created_by on public.projects (created_by);
create index if not exists idx_project_interests_project on public.project_interests (project_id);
create index if not exists idx_project_interests_user on public.project_interests (user_email);
