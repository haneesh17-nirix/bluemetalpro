-- ============================================================
-- 020_fix_user_access.sql
-- Restore user_tenant_access and user_crusher_access broken by
-- migration 019: the DO $$ block used hardcoded UUIDs that did
-- not match the actual user UUIDs preserved by ON CONFLICT DO UPDATE.
-- This migration uses email-based subqueries to find real UUIDs.
-- Safe to re-run (ON CONFLICT DO NOTHING).
-- ============================================================

-- Clear any partial/stale rows first
DELETE FROM user_tenant_access;
DELETE FROM user_crusher_access;

-- ── Tenant access ─────────────────────────────────────────────────────────
INSERT INTO user_tenant_access (user_id, tenant_id, role)
SELECT u.id, t.id, 'admin'
FROM users u CROSS JOIN tenants t
WHERE u.email = 'admin@bluemetal.local'
ON CONFLICT (user_id, tenant_id) DO NOTHING;

INSERT INTO user_tenant_access (user_id, tenant_id, role)
SELECT u.id, t.id, 'operations'
FROM users u CROSS JOIN tenants t
WHERE u.email = 'ops@bluemetal.local'
ON CONFLICT (user_id, tenant_id) DO NOTHING;

INSERT INTO user_tenant_access (user_id, tenant_id, role)
SELECT u.id, t.id, 'operations'
FROM users u CROSS JOIN tenants t
WHERE u.email = 'ops2@bluemetal.local'
ON CONFLICT (user_id, tenant_id) DO NOTHING;

INSERT INTO user_tenant_access (user_id, tenant_id, role)
SELECT u.id, t.id, 'report_viewer'
FROM users u CROSS JOIN tenants t
WHERE u.email = 'reports@bluemetal.local'
ON CONFLICT (user_id, tenant_id) DO NOTHING;

-- ── Crusher access ────────────────────────────────────────────────────────
-- Admin gets both plants
INSERT INTO user_crusher_access (user_id, crusher_id, role)
SELECT u.id, c.id, 'admin'
FROM users u CROSS JOIN crushers c
WHERE u.email = 'admin@bluemetal.local'
ON CONFLICT (user_id, crusher_id) DO NOTHING;

-- Ops1 → Hosur Road Plant only
INSERT INTO user_crusher_access (user_id, crusher_id, role)
SELECT u.id, c.id, 'operations'
FROM users u CROSS JOIN crushers c
WHERE u.email = 'ops@bluemetal.local' AND c.name = 'Hosur Road Plant'
ON CONFLICT (user_id, crusher_id) DO NOTHING;

-- Ops2 → Tumkur Highway Plant only
INSERT INTO user_crusher_access (user_id, crusher_id, role)
SELECT u.id, c.id, 'operations'
FROM users u CROSS JOIN crushers c
WHERE u.email = 'ops2@bluemetal.local' AND c.name = 'Tumkur Highway Plant'
ON CONFLICT (user_id, crusher_id) DO NOTHING;

-- Report viewer → both plants
INSERT INTO user_crusher_access (user_id, crusher_id, role)
SELECT u.id, c.id, 'report_viewer'
FROM users u CROSS JOIN crushers c
WHERE u.email = 'reports@bluemetal.local'
ON CONFLICT (user_id, crusher_id) DO NOTHING;

-- ── Fix platform admin flag (also uses hardcoded UUID in 019) ─────────────
UPDATE users SET is_platform_admin = true WHERE email = 'platform@bluemetal.local';
