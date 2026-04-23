-- Let anonymous visitors read the small public data the Home page needs
-- (active job sample + approved user counts). RLS for `authenticated` is
-- unchanged; this only adds `anon` SELECT policies.

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
