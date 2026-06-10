-- ============================================================
-- 011_fix_test_passwords.sql
-- Set all test accounts to Test@1234.
-- Hash: bcrypt(Test@1234, rounds=10)
-- ============================================================

UPDATE users
SET password_hash = '$2a$10$uExSDVxMC/KADd3jiPZTz.SgF7qUlrOX0MNPrK5g6Qisma2T3QgZy'
WHERE email LIKE '%@bluemetal.local';
