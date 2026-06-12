-- 015_weighbridge_counter_per_crusher.sql
-- Move weighbridge_ticket_counter from company_config to crushers for per-crusher isolation

ALTER TABLE crushers
  ADD COLUMN IF NOT EXISTS weighbridge_ticket_counter INTEGER DEFAULT 0;

UPDATE crushers c
SET weighbridge_ticket_counter = COALESCE(
  (SELECT weighbridge_ticket_counter FROM company_config LIMIT 1), 0
);
