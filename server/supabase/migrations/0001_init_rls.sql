-- ============================================================================
-- ElimuPopote — Row Level Security
-- ----------------------------------------------------------------------------
-- These policies are the database-level backstop for multi-tenancy. They
-- read the tenant id from the JWT custom claim `app_metadata.tenant_id`,
-- which our mock-OTP auth flow sets when it mints a Supabase session
-- (see server/src/services/supabaseAuth.service.ts).
--
-- Run after `prisma migrate dev` has created the tables (Prisma does not
-- manage RLS, so this lives in supabase/migrations and is applied via
-- `supabase db push` or `supabase migration up`).
-- ============================================================================

-- Helper: pulls tenant_id out of the current request's JWT.
-- Superadmins have tenant_id = NULL in their JWT, so they will not match
-- any row via this helper — Superadmin-only tables (tenants) get separate
-- policies below that check role instead.
create or replace function auth.current_tenant_id() returns text as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'tenant_id', '');
$$ language sql stable;

create or replace function auth.current_role() returns text as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '');
$$ language sql stable;

-- ----------------------------------------------------------------------------
-- TENANTS — only SUPERADMIN can read/write any tenant row.
-- Tenant admins may read (but not write) their OWN tenant row.
-- ----------------------------------------------------------------------------
alter table tenants enable row level security;

create policy tenants_superadmin_all on tenants
  for all
  using (auth.current_role() = 'SUPERADMIN');

create policy tenants_self_read on tenants
  for select
  using (id::text = auth.current_tenant_id());

-- ----------------------------------------------------------------------------
-- USERS
-- ----------------------------------------------------------------------------
alter table users enable row level security;

create policy users_tenant_isolation on users
  for all
  using (
    auth.current_role() = 'SUPERADMIN'
    or tenant_id::text = auth.current_tenant_id()
  );

-- ----------------------------------------------------------------------------
-- COURSES / LESSONS / QUIZZES / QUIZ_OPTIONS / ENROLLMENTS / PROGRESS / LIVE_SESSIONS
-- Same pattern repeated: tenant_id must match the caller's JWT tenant_id,
-- OR the caller is SUPERADMIN.
-- ----------------------------------------------------------------------------
alter table courses        enable row level security;
alter table lessons        enable row level security;
alter table quizzes        enable row level security;
alter table quiz_questions enable row level security;
alter table quiz_options   enable row level security;
alter table enrollments    enable row level security;
alter table progress       enable row level security;
alter table live_sessions  enable row level security;

create policy courses_tenant_isolation on courses
  for all using (auth.current_role() = 'SUPERADMIN' or tenant_id::text = auth.current_tenant_id());

create policy lessons_tenant_isolation on lessons
  for all using (auth.current_role() = 'SUPERADMIN' or tenant_id::text = auth.current_tenant_id());

create policy quizzes_tenant_isolation on quizzes
  for all using (auth.current_role() = 'SUPERADMIN' or tenant_id::text = auth.current_tenant_id());

create policy quiz_questions_tenant_isolation on quiz_questions
  for all using (auth.current_role() = 'SUPERADMIN' or tenant_id::text = auth.current_tenant_id());

create policy quiz_options_tenant_isolation on quiz_options
  for all using (auth.current_role() = 'SUPERADMIN' or tenant_id::text = auth.current_tenant_id());

create policy enrollments_tenant_isolation on enrollments
  for all using (auth.current_role() = 'SUPERADMIN' or tenant_id::text = auth.current_tenant_id());

create policy progress_tenant_isolation on progress
  for all using (auth.current_role() = 'SUPERADMIN' or tenant_id::text = auth.current_tenant_id());

create policy live_sessions_tenant_isolation on live_sessions
  for all using (auth.current_role() = 'SUPERADMIN' or tenant_id::text = auth.current_tenant_id());

-- ----------------------------------------------------------------------------
-- LEARNER-ONLY REFINEMENT (defense in depth, optional, commented out by
-- default since the Express layer already filters by enrollment + status):
--
-- create policy learners_see_only_published_courses on courses
--   for select
--   using (
--     status = 'PUBLISHED'
--     and auth.current_role() = 'LEARNER'
--   );
-- ----------------------------------------------------------------------------
