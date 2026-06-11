-- 014_add_tenants.sql
-- Introduces the tenant layer above crushers.
-- A tenant = a crusher company (e.g. "BlueMetal Aggregates Pvt Ltd").
-- Crushers belong to a tenant. Users can be granted access at the tenant level
-- (via user_tenant_access — sees all crushers in that tenant) or at the
-- individual crusher level (user_crusher_access — existing behaviour).

-- ── 1. Tenants table ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenants (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  legal_name  VARCHAR(255),
  gstin       VARCHAR(20),
  pan         VARCHAR(20),
  logo_url    TEXT,
  address     TEXT,
  city        VARCHAR(100),
  state       VARCHAR(100),
  phone       VARCHAR(20),
  email       VARCHAR(255),
  plan        VARCHAR(50)  NOT NULL DEFAULT 'standard',
  is_active   BOOLEAN      NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ── 2. Add tenant_id to crushers ─────────────────────────────────────────
ALTER TABLE crushers ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE crushers DROP CONSTRAINT IF EXISTS crushers_tenant_id_fkey;
ALTER TABLE crushers ADD CONSTRAINT crushers_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;

-- ── 3. Tenant-level user access ───────────────────────────────────────────
-- A user with an entry here has the given role on EVERY crusher in that tenant.
CREATE TABLE IF NOT EXISTS user_tenant_access (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  tenant_id  UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role       user_role   NOT NULL DEFAULT 'report_viewer',
  is_active  BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, tenant_id)
);

-- ── 4. Migrate existing crushers to a default tenant ─────────────────────
DO $$
DECLARE t_id UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM crushers WHERE tenant_id IS NULL LIMIT 1) THEN
    INSERT INTO tenants (name, legal_name, city, state, plan)
    VALUES ('Default Company', 'Default Company Pvt Ltd', '', '', 'standard')
    RETURNING id INTO t_id;

    UPDATE crushers SET tenant_id = t_id WHERE tenant_id IS NULL;

    RAISE NOTICE 'Migrated existing crushers → tenant %', t_id;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_crushers_tenant_id ON crushers(tenant_id);

ALTER TABLE crushers ALTER COLUMN tenant_id SET NOT NULL;
