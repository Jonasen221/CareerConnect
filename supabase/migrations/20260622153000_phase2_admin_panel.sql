-- =============================================================================
-- Phase 2 / Feature 3: Admin Panel (Candidate Control)
-- =============================================================================
-- Adds:
--   * Profile moderation: flagged, internal_notes, suspension_reason,
--     verified_student, notification_message on student_profiles and
--     recruiter_profiles. Extends status semantics with 'suspended' / 'banned'
--     (no DB-level CHECK so existing rows + UI flows remain forgiving).
--   * app_settings table — single-row global config (moderation defaults,
--     trusted student email domains, etc.)
--   * admin_actions table — append-only audit trail of every admin write +
--     (when enabled) every admin page view.
--   * Restrictive RLS on admin_actions (admins only) using a SECURITY DEFINER
--     helper that checks public.profiles.role.
-- =============================================================================

-- --- profile additions --------------------------------------------------------
alter table public.student_profiles
  add column if not exists flagged boolean default false,
  add column if not exists internal_notes text,
  add column if not exists suspension_reason text,
  add column if not exists verified_student boolean default false,
  add column if not exists notification_message text;

alter table public.recruiter_profiles
  add column if not exists flagged boolean default false,
  add column if not exists internal_notes text,
  add column if not exists suspension_reason text,
  add column if not exists notification_message text;

-- --- app_settings (singleton) ------------------------------------------------
create table if not exists public.app_settings (
  id uuid primary key default gen_random_uuid(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  singleton boolean not null default true,
  moderation_students boolean not null default false,
  moderation_recruiters boolean not null default false,
  trusted_student_email_domains jsonb not null default '[]'::jsonb,
  log_admin_page_views boolean not null default true,
  data jsonb not null default '{}'::jsonb
);

-- Enforce single-row table (singleton pattern).
create unique index if not exists app_settings_singleton_uidx
  on public.app_settings (singleton);

-- Seed the single row if missing.
insert into public.app_settings (singleton)
  select true
  where not exists (select 1 from public.app_settings);

-- --- admin_actions (audit log) -----------------------------------------------
create table if not exists public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  created_date timestamptz not null default now(),
  admin_id uuid,
  admin_email text,
  action text not null,                 -- e.g. 'approve', 'suspend', 'page_view'
  target_type text,                     -- 'student_profile', 'page', etc.
  target_id text,                       -- uuid or path string
  target_label text,                    -- human-readable identifier
  reason text,
  notes text,
  metadata jsonb default '{}'::jsonb
);

create index if not exists idx_admin_actions_admin_id on public.admin_actions (admin_id);
create index if not exists idx_admin_actions_created_date on public.admin_actions (created_date desc);
create index if not exists idx_admin_actions_target on public.admin_actions (target_type, target_id);
create index if not exists idx_admin_actions_action on public.admin_actions (action);

-- --- helper: is the calling user an admin? ----------------------------------
create or replace function public.is_admin(check_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = check_user_id and coalesce(p.role, '') = 'admin'
  );
$$;

grant execute on function public.is_admin(uuid) to authenticated, anon;

-- --- RLS ---------------------------------------------------------------------

-- app_settings: any authenticated user can READ (e.g. Onboarding needs to know
-- if moderation is on); only admins can write. Anon also gets SELECT so the
-- public marketing flow doesn't 401.
alter table public.app_settings enable row level security;

drop policy if exists "app_settings: read all" on public.app_settings;
create policy "app_settings: read all" on public.app_settings
  for select to anon, authenticated using (true);

drop policy if exists "app_settings: admin update" on public.app_settings;
create policy "app_settings: admin update" on public.app_settings
  for update to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists "app_settings: admin insert" on public.app_settings;
create policy "app_settings: admin insert" on public.app_settings
  for insert to authenticated
  with check (public.is_admin(auth.uid()));

-- admin_actions: only admins can read or write. Inserts also include the
-- caller's auth.uid() as admin_id, but we don't enforce that match in RLS so
-- that the SECURITY DEFINER helper stays the only authority.
alter table public.admin_actions enable row level security;

drop policy if exists "admin_actions: admin all" on public.admin_actions;
create policy "admin_actions: admin all" on public.admin_actions
  for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));
