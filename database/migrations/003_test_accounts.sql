-- ============================================================
-- TEST ACCOUNTS (idempotent — safe to run multiple times)
-- ============================================================
-- One account per role for QA and demo purposes.
-- Roles use original enum values; migration 010 maps to new roles.
-- DO NOT use in production without changing passwords.
-- ============================================================

INSERT INTO users (name, email, password_hash, role, is_active) VALUES
  ('Admin User',      'admin@bluemetal.local',   '$2a$10$oBVr/.Nb3eYU7CLduQCUfOueEYwPolVls/SePCrMCtmbVL1H9HdiO', 'admin',            true),
  ('Sales Operator',  'sales@bluemetal.local',   '$2a$10$o8.12Vm1f2T4GcEzFuciU.NBAHJ2dRr4Y9.AqjfUGaJmjOeHPqmEW', 'sales_operator',   true),
  ('Accounts',        'accounts@bluemetal.local','$2a$10$rylxEmHmpaGQrA8fIB/60.AAJJR7cxabMiI4qIQqYogOPQXpXIHPO', 'accounts',         true),
  ('Report Viewer',   'reports@bluemetal.local', '$2a$10$sMjXE6h4wF5b9VNpHgA86.EffX2QMLP4mdeUuns9dyrvcNLd9I9Qu', 'report_viewer',    true),
  ('Vehicle Manager', 'vehicle@bluemetal.local', '$2a$10$Dj1jOp3STKTYSW0Zi4nLTu9bUg1buZz/21JQJjnk/hWNxAFxeolN2', 'vehicle_manager',  true),
  ('Quarry Operator', 'quarry@bluemetal.local',  '$2a$10$XrC/siFP9D.EjYK53x6fnO4m7kmnZYvwh3CfqfPJ/oU/pEjPz6GbK', 'quarry_operator',  true)
ON CONFLICT (email) DO UPDATE SET
  name          = EXCLUDED.name,
  password_hash = EXCLUDED.password_hash,
  role          = EXCLUDED.role,
  is_active     = EXCLUDED.is_active,
  updated_at    = now();
