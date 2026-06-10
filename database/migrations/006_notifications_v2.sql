-- 006_notifications_v2.sql
-- Add metadata column to notifications (crusher_id already added in 004)
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Add partner role
DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'partner';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add notification_events pref column (which events they want)
ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_events TEXT[] DEFAULT ARRAY['sale','purchase','maintenance','quarry','wages'];

-- Better index for SSE fan-out query
CREATE INDEX IF NOT EXISTS idx_notifications_crusher_user ON notifications(crusher_id, user_id, is_read, sent_at DESC);
