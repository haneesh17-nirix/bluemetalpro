-- =============================================================
-- 012_cleanup_duplicate_crushers.sql
-- Remove duplicate crusher rows created by repeated migration runs.
-- Re-homes all FK references to the keeper rows before deleting.
-- =============================================================

DO $$
DECLARE
  c1 UUID;  -- BlueMetal Quarry Unit 1 (Hosur)
  c2 UUID;  -- BlueMetal Quarry Unit 2 (Salem)

  u_admin      UUID;
  u_operator1  UUID;
  u_reports    UUID;
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

  -- ── 2. Re-home all FK references from duplicate Unit-1 rows to c1 ─────────
  UPDATE sales              SET crusher_id = c1 WHERE crusher_id IN (SELECT id FROM crushers WHERE name ILIKE '%Unit 1%' AND id <> c1);
  UPDATE purchases          SET crusher_id = c1 WHERE crusher_id IN (SELECT id FROM crushers WHERE name ILIKE '%Unit 1%' AND id <> c1);
  UPDATE quarry_sales       SET crusher_id = c1 WHERE crusher_id IN (SELECT id FROM crushers WHERE name ILIKE '%Unit 1%' AND id <> c1);
  UPDATE parties            SET crusher_id = c1 WHERE crusher_id IN (SELECT id FROM crushers WHERE name ILIKE '%Unit 1%' AND id <> c1);
  UPDATE vehicles           SET crusher_id = c1 WHERE crusher_id IN (SELECT id FROM crushers WHERE name ILIKE '%Unit 1%' AND id <> c1);
  UPDATE products           SET crusher_id = c1 WHERE crusher_id IN (SELECT id FROM crushers WHERE name ILIKE '%Unit 1%' AND id <> c1);
  UPDATE workers            SET crusher_id = c1 WHERE crusher_id IN (SELECT id FROM crushers WHERE name ILIKE '%Unit 1%' AND id <> c1);
  UPDATE assets             SET crusher_id = c1 WHERE crusher_id IN (SELECT id FROM crushers WHERE name ILIKE '%Unit 1%' AND id <> c1);
  UPDATE ledger_transactions SET crusher_id = c1 WHERE crusher_id IN (SELECT id FROM crushers WHERE name ILIKE '%Unit 1%' AND id <> c1);
  UPDATE maintenance_records SET crusher_id = c1 WHERE crusher_id IN (SELECT id FROM crushers WHERE name ILIKE '%Unit 1%' AND id <> c1);
  UPDATE attendance         SET crusher_id = c1 WHERE crusher_id IN (SELECT id FROM crushers WHERE name ILIKE '%Unit 1%' AND id <> c1);
  UPDATE cameras            SET crusher_id = c1 WHERE crusher_id IN (SELECT id FROM crushers WHERE name ILIKE '%Unit 1%' AND id <> c1);
  UPDATE notifications      SET crusher_id = c1 WHERE crusher_id IN (SELECT id FROM crushers WHERE name ILIKE '%Unit 1%' AND id <> c1);
  UPDATE wage_payments      SET crusher_id = c1 WHERE crusher_id IN (SELECT id FROM crushers WHERE name ILIKE '%Unit 1%' AND id <> c1);

  -- ── 3. Re-home all FK references from duplicate Unit-2 rows to c2 ─────────
  UPDATE sales              SET crusher_id = c2 WHERE crusher_id IN (SELECT id FROM crushers WHERE name ILIKE '%Unit 2%' AND id <> c2);
  UPDATE purchases          SET crusher_id = c2 WHERE crusher_id IN (SELECT id FROM crushers WHERE name ILIKE '%Unit 2%' AND id <> c2);
  UPDATE quarry_sales       SET crusher_id = c2 WHERE crusher_id IN (SELECT id FROM crushers WHERE name ILIKE '%Unit 2%' AND id <> c2);
  UPDATE parties            SET crusher_id = c2 WHERE crusher_id IN (SELECT id FROM crushers WHERE name ILIKE '%Unit 2%' AND id <> c2);
  UPDATE vehicles           SET crusher_id = c2 WHERE crusher_id IN (SELECT id FROM crushers WHERE name ILIKE '%Unit 2%' AND id <> c2);
  UPDATE products           SET crusher_id = c2 WHERE crusher_id IN (SELECT id FROM crushers WHERE name ILIKE '%Unit 2%' AND id <> c2);
  UPDATE workers            SET crusher_id = c2 WHERE crusher_id IN (SELECT id FROM crushers WHERE name ILIKE '%Unit 2%' AND id <> c2);
  UPDATE assets             SET crusher_id = c2 WHERE crusher_id IN (SELECT id FROM crushers WHERE name ILIKE '%Unit 2%' AND id <> c2);
  UPDATE ledger_transactions SET crusher_id = c2 WHERE crusher_id IN (SELECT id FROM crushers WHERE name ILIKE '%Unit 2%' AND id <> c2);
  UPDATE maintenance_records SET crusher_id = c2 WHERE crusher_id IN (SELECT id FROM crushers WHERE name ILIKE '%Unit 2%' AND id <> c2);
  UPDATE attendance         SET crusher_id = c2 WHERE crusher_id IN (SELECT id FROM crushers WHERE name ILIKE '%Unit 2%' AND id <> c2);
  UPDATE cameras            SET crusher_id = c2 WHERE crusher_id IN (SELECT id FROM crushers WHERE name ILIKE '%Unit 2%' AND id <> c2);
  UPDATE notifications      SET crusher_id = c2 WHERE crusher_id IN (SELECT id FROM crushers WHERE name ILIKE '%Unit 2%' AND id <> c2);
  UPDATE wage_payments      SET crusher_id = c2 WHERE crusher_id IN (SELECT id FROM crushers WHERE name ILIKE '%Unit 2%' AND id <> c2);

  -- ── 4. Remove access rows for duplicates, then delete duplicates ──────────
  DELETE FROM user_crusher_access WHERE crusher_id NOT IN (c1, c2);
  DELETE FROM crushers WHERE id NOT IN (c1, c2);

  -- ── 5. Normalise keeper names ─────────────────────────────────────────────
  UPDATE crushers SET name = 'BlueMetal Quarry Unit 1' WHERE id = c1;
  UPDATE crushers SET name = 'BlueMetal Quarry Unit 2' WHERE id = c2;

  -- ── 6. Re-wire user_crusher_access for test accounts ─────────────────────
  SELECT id INTO u_admin     FROM users WHERE email = 'admin@bluemetal.local'     LIMIT 1;
  SELECT id INTO u_operator1 FROM users WHERE email = 'operator1@bluemetal.local' LIMIT 1;
  SELECT id INTO u_reports   FROM users WHERE email = 'reports@bluemetal.local'   LIMIT 1;

  IF u_admin IS NOT NULL THEN
    INSERT INTO user_crusher_access (user_id, crusher_id, role)
      VALUES (u_admin, c1, 'admin'), (u_admin, c2, 'admin')
    ON CONFLICT (user_id, crusher_id) DO UPDATE SET role = EXCLUDED.role;
  END IF;

  IF u_operator1 IS NOT NULL THEN
    INSERT INTO user_crusher_access (user_id, crusher_id, role)
      VALUES (u_operator1, c1, 'operations'), (u_operator1, c2, 'operations')
    ON CONFLICT (user_id, crusher_id) DO UPDATE SET role = EXCLUDED.role;
  END IF;

  IF u_reports IS NOT NULL THEN
    INSERT INTO user_crusher_access (user_id, crusher_id, role)
      VALUES (u_reports, c1, 'report_viewer'), (u_reports, c2, 'report_viewer')
    ON CONFLICT (user_id, crusher_id) DO UPDATE SET role = EXCLUDED.role;
  END IF;

  RAISE NOTICE 'Cleanup complete. 2 crushers remain.';
END;
$$;
