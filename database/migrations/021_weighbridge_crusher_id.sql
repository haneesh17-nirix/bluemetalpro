-- Add crusher_id FK to weighbridges so each scale belongs to a specific plant
ALTER TABLE weighbridges
  ADD COLUMN IF NOT EXISTS crusher_id UUID REFERENCES crushers(id) ON DELETE CASCADE;

-- Index for crusher-scoped queries
CREATE INDEX IF NOT EXISTS idx_weighbridges_crusher_id ON weighbridges(crusher_id);
