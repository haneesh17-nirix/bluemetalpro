-- ============================================================
-- TEST ACCOUNTS (idempotent — safe to run multiple times)
-- ============================================================
-- One account per role for QA and demo purposes.
-- All passwords: Test@1234
-- DO NOT use in production without changing passwords.
-- ============================================================

INSERT INTO users (name, email, password_hash, role, is_active) VALUES
  ('Admin User',    'admin@bluemetal.local',   '$2a$10$oBVr/.Nb3eYU7CLduQCUfOueEYwPolVls/SePCrMCtmbVL1H9HdiO', 'admin',         true),
  ('Operations',    'sales@bluemetal.local',   '$2a$10$uExSDVxMC/KADd3jiPZTz.SgF7qUlrOX0MNPrK5g6Qisma2T3QgZy', 'operations',    true),
  ('Operations 2',  'accounts@bluemetal.local','$2a$10$uExSDVxMC/KADd3jiPZTz.SgF7qUlrOX0MNPrK5g6Qisma2T3QgZy', 'operations',    true),
  ('Report Viewer', 'reports@bluemetal.local', '$2a$10$luc3ZfXwe43i0YWaVZvg0.VUDNB0BXvijEyy/oyPLc04sMf7f.Swm', 'report_viewer', true)
ON CONFLICT (email) DO UPDATE SET
  name          = EXCLUDED.name,
  password_hash = EXCLUDED.password_hash,
  role          = EXCLUDED.role,
  is_active     = EXCLUDED.is_active,
  updated_at    = now();
