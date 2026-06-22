-- =============================================================================
-- Phase 2 / Feature 4: Swipe for Connections
-- =============================================================================
-- Adds the data model for peer-to-peer discovery:
--   * connection_swipes: one row per direction-decision (right or left)
--   * connections: emitted when both peers right-swipe (or one accepts the
--     other's pending request from the inbox). Drives the Connections list.
--   * connect_opt_out + connect_audience columns on both profile tables so
--     users can hide themselves from the deck and tune who they want to meet.
-- =============================================================================

-- --- profile additions --------------------------------------------------------
alter table public.student_profiles
  add column if not exists connect_opt_out boolean default false,
  add column if not exists connect_audience jsonb default '["student","recruiter"]'::jsonb;

alter table public.recruiter_profiles
  add column if not exists connect_opt_out boolean default false,
  add column if not exists connect_audience jsonb default '["student","recruiter"]'::jsonb;

-- --- connection_swipes -------------------------------------------------------
create table if not exists public.connection_swipes (
  id uuid primary key default gen_random_uuid(),
  created_by text,                          -- swiper email
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  swiper_email text not null,
  swiper_role text,                         -- 'student' | 'recruiter' | 'admin'
  target_email text not null,
  target_role text,
  direction text not null check (direction in ('right', 'left')),
  data jsonb default '{}'::jsonb
);

create unique index if not exists connection_swipes_unique_pair
  on public.connection_swipes (swiper_email, target_email);

create index if not exists idx_connection_swipes_target
  on public.connection_swipes (target_email, direction);

create index if not exists idx_connection_swipes_swiper
  on public.connection_swipes (swiper_email, direction);

-- --- connections (mutual + accepted) -----------------------------------------
-- We store a canonical (user_a_email < user_b_email) pair so a single index
-- enforces "one connection per ordered pair" regardless of who swiped first.
create table if not exists public.connections (
  id uuid primary key default gen_random_uuid(),
  created_by text,                          -- whoever triggered the row
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  user_a_email text not null,               -- lexically smaller email
  user_b_email text not null,               -- lexically larger email
  user_a_role text,
  user_b_role text,
  user_a_name text,
  user_b_name text,
  status text not null default 'accepted',  -- 'accepted' | 'closed' | 'blocked'
  initiated_by_email text,                  -- whoever right-swiped first
  match_id uuid,                            -- mirrored matches.id for chat
  data jsonb default '{}'::jsonb
);

create unique index if not exists connections_unique_pair
  on public.connections (user_a_email, user_b_email);

create index if not exists idx_connections_user_a on public.connections (user_a_email);
create index if not exists idx_connections_user_b on public.connections (user_b_email);
create index if not exists idx_connections_status on public.connections (status);

-- --- RLS ---------------------------------------------------------------------
-- Both tables are blanket "authenticated all" — same pattern as swipes /
-- matches / messages today. Tighter row-level policies can be layered later
-- without breaking this migration.
alter table public.connection_swipes enable row level security;
drop policy if exists "connection_swipes: auth all" on public.connection_swipes;
create policy "connection_swipes: auth all" on public.connection_swipes
  for all to authenticated
  using (true) with check (true);

alter table public.connections enable row level security;
drop policy if exists "connections: auth all" on public.connections;
create policy "connections: auth all" on public.connections
  for all to authenticated
  using (true) with check (true);
