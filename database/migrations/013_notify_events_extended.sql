-- 013_notify_events_extended.sql
-- Extend default notify_events to include new event types added in v1.22+
-- Users with NULL get all events; users with existing array keep their prefs as-is.
-- Safe to re-run (no-ops on users who already have the new events in their array).

UPDATE users
SET notify_events = ARRAY['sale','purchase','maintenance','quarry','wages','vehicle','party','weighbridge','ledger']
WHERE notify_events IS NULL
   OR notify_events = ARRAY['sale','purchase','maintenance','quarry','wages']::TEXT[];
