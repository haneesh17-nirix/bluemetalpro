-- =============================================================
-- 008_platform_admin.sql  — Platform admin role + account
-- Idempotent — safe to re-run.
-- =============================================================

-- Add platform_admin to the user_role enum
DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'platform_admin';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Platform admin account
-- Password: Platform@123
INSERT INTO users (name, email, password_hash, role, is_active) VALUES
  ('Platform Admin', 'platform@bluemetal.local',
   '$2a$10$Iu6A49xc5nzHqxED4xF5v.lN79KFqqqHFGySYZB45nDHkbepP0W0u',
   'platform_admin', true)
ON CONFLICT (email) DO UPDATE SET
  name          = EXCLUDED.name,
  password_hash = EXCLUDED.password_hash,
  role          = EXCLUDED.role,
  is_active     = EXCLUDED.is_active,
  updated_at    = now();

-- platform_admin does NOT get crusher access rows — they have platform-wide access
-- and bypass crusher selection entirely in the auth flow.
