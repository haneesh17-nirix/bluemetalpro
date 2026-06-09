-- ============================================================
-- 005_seed_crusher_access.sql
-- Ensure every existing user has access to every crusher.
-- Idempotent — safe to re-run. Fills gaps left if users were
-- created after 004_crushers.sql already ran.
-- ============================================================

-- Grant all users access to all crushers they don't have yet.
-- Role defaults to the user's global role.
INSERT INTO user_crusher_access (user_id, crusher_id, role)
SELECT u.id, c.id, u.role
FROM users u
CROSS JOIN crushers c
WHERE c.is_active = true AND u.is_active = true
ON CONFLICT (user_id, crusher_id) DO NOTHING;
