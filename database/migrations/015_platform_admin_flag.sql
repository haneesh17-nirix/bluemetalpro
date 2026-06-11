ALTER TABLE users ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN NOT NULL DEFAULT false;

UPDATE users SET is_platform_admin = true WHERE role = 'platform_admin';
