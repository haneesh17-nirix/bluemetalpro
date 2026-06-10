-- ============================================================
-- 011_fix_test_passwords.sql
-- Align admin@ and reports@ passwords to Test@1234 so all
-- test accounts use the same credentials as documented.
-- Hash: bcrypt(Test@1234, rounds=10)
-- ============================================================

UPDATE users
SET password_hash = '$2a$10$uExSDVxMC/KADd3jiPZTz.SgF7qUlrOX0MNPrK5g6Qisma2T3QgZy'
WHERE email IN ('admin@bluemetal.local', 'reports@bluemetal.local');
