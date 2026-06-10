-- =============================================================
-- 012_cleanup_duplicate_crushers.sql
-- Remove duplicate crusher rows created by repeated migration runs.
-- Keeps only the two crushers that actually have seeded data,
-- then re-wires user_crusher_access for all test accounts.
-- =============================================================

DO $$
DECLARE
  -- The two crusher IDs that have real data (identified by sales count > 0)
  c1 UUID;  -- BlueMetal Quarry Unit 1 (Hosur)
  c2 UUID;  -- BlueMetal Quarry Unit 2 (Salem)
  main_plant UUID;

  -- Test user IDs
  u_admin      UUID;
  u_operator1  UUID;
  u_reports    UUID;
  u_platadmin  UUID;
BEGIN

  -- ── 1. Identify the two crushers that have data ───────────────────────────
  SELECT DISTINCT s.crusher_id INTO c1
    FROM sales s
    JOIN crushers c ON c.id = s.crusher_id
   WHERE c.name ILIKE '%Unit 1%'
   LIMIT 1;

  SELECT DISTINCT s.crusher_id INTO c2
    FROM sales s
    JOIN crushers c ON c.id = s.crusher_id
   WHERE c.name ILIKE '%Unit 2%'
   LIMIT 1;

  IF c1 IS NULL OR c2 IS NULL THEN
    RAISE NOTICE 'Could not identify crusher IDs with data — skipping cleanup.';
    RETURN;
  END IF;

  RAISE NOTICE 'Keeping Unit1=% Unit2=%', c1, c2;

  -- ── 2. Delete user_crusher_access for all OTHER crushers ─────────────────
  DELETE FROM user_crusher_access
   WHERE crusher_id NOT IN (c1, c2);

  -- ── 3. Delete all other crusher rows (cascade cleans up access) ──────────
  -- Safe: cascade delete handles user_crusher_access via FK
  DELETE FROM crushers
   WHERE id NOT IN (c1, c2);

  -- ── 4. Ensure crusher names are clean ────────────────────────────────────
  UPDATE crushers SET name = 'BlueMetal Quarry Unit 1', location = 'Hosur, TN'
   WHERE id = c1;
  UPDATE crushers SET name = 'BlueMetal Quarry Unit 2', location = 'Salem, TN'
   WHERE id = c2;

  -- ── 5. Re-wire user_crusher_access for test accounts ─────────────────────
  SELECT id INTO u_admin     FROM users WHERE email = 'admin@bluemetal.local'     LIMIT 1;
  SELECT id INTO u_operator1 FROM users WHERE email = 'operator1@bluemetal.local' LIMIT 1;
  SELECT id INTO u_reports   FROM users WHERE email = 'reports@bluemetal.local'   LIMIT 1;
  SELECT id INTO u_platadmin FROM users WHERE email = 'platadmin@bluemetal.local' LIMIT 1;

  -- admin → both units
  IF u_admin IS NOT NULL THEN
    INSERT INTO user_crusher_access (user_id, crusher_id, role)
      VALUES (u_admin, c1, 'admin'), (u_admin, c2, 'admin')
    ON CONFLICT (user_id, crusher_id) DO UPDATE SET role = EXCLUDED.role;
  END IF;

  -- operator1 → both units
  IF u_operator1 IS NOT NULL THEN
    INSERT INTO user_crusher_access (user_id, crusher_id, role)
      VALUES (u_operator1, c1, 'operations'), (u_operator1, c2, 'operations')
    ON CONFLICT (user_id, crusher_id) DO UPDATE SET role = EXCLUDED.role;
  END IF;

  -- reports → both units (read-only viewer)
  IF u_reports IS NOT NULL THEN
    INSERT INTO user_crusher_access (user_id, crusher_id, role)
      VALUES (u_reports, c1, 'report_viewer'), (u_reports, c2, 'report_viewer')
    ON CONFLICT (user_id, crusher_id) DO UPDATE SET role = EXCLUDED.role;
  END IF;

  RAISE NOTICE 'Cleanup complete. 2 crushers remain.';
END;
$$;
