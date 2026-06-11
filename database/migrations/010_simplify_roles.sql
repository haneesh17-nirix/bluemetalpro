-- 010_simplify_roles.sql — Collapse roles to: admin, operations, report_viewer, platform_admin
DO $$
BEGIN
  -- Add 'operations' to enum if not present
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'operations'
                 AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')) THEN
    ALTER TYPE user_role ADD VALUE 'operations';
  END IF;
END $$;

-- Migrate existing rows: all old granular roles → operations
UPDATE users SET role = 'operations'
WHERE role::text IN ('sales_operator','quarry_operator','vehicle_manager','accounts');

UPDATE user_crusher_access SET role = 'operations'
WHERE role::text IN ('sales_operator','quarry_operator','vehicle_manager','accounts');

-- Reset test account passwords to Test@1234
-- Hash: $2a$10$uExSDVxMC/KADd3jiPZTz.SgF7qUlrOX0MNPrK5g6Qisma2T3QgZy
UPDATE users
SET password_hash = '$2a$10$uExSDVxMC/KADd3jiPZTz.SgF7qUlrOX0MNPrK5g6Qisma2T3QgZy'
WHERE email IN (
  'sales@bluemetal.local',
  'accounts@bluemetal.local',
  'manager@bluemetal.local',
  'operator1@bluemetal.local',
  'operator2@bluemetal.local',
  'maintenance@bluemetal.local'
);

-- Note: old enum values (sales_operator etc.) remain in the type but are no longer used.
-- PostgreSQL does not support dropping enum values without a full type rebuild.
