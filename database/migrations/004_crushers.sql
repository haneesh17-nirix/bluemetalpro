-- =============================================================
-- 004_crushers.sql  — Multi-crusher support
-- =============================================================

-- 1. Crushers master table (each crusher/plant is a GST entity)
CREATE TABLE IF NOT EXISTS crushers (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                    VARCHAR(200) NOT NULL,
  legal_name              VARCHAR(200),
  gstin                   VARCHAR(15),
  pan                     VARCHAR(10),
  address                 TEXT,
  city                    VARCHAR(100),
  state                   VARCHAR(100),
  state_code              VARCHAR(5),
  pincode                 VARCHAR(6),
  phone                   VARCHAR(15),
  email                   VARCHAR(150),
  logo_url                TEXT,
  bank_name               VARCHAR(100),
  bank_account            VARCHAR(20),
  bank_ifsc               VARCHAR(11),
  bank_branch             VARCHAR(100),
  invoice_prefix          VARCHAR(10)  DEFAULT 'INV',
  invoice_counter         INTEGER      DEFAULT 1,
  quarry_invoice_prefix   VARCHAR(10)  DEFAULT 'QRY',
  quarry_invoice_counter  INTEGER      DEFAULT 1,
  terms_conditions        TEXT,
  is_active               BOOLEAN      DEFAULT true,
  created_at              TIMESTAMPTZ  DEFAULT now(),
  updated_at              TIMESTAMPTZ  DEFAULT now()
);

-- 2. User → crusher access (per-user, per-crusher role assignment)
CREATE TABLE IF NOT EXISTS user_crusher_access (
  id          UUID       PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  crusher_id  UUID       NOT NULL REFERENCES crushers(id) ON DELETE CASCADE,
  role        user_role  NOT NULL DEFAULT 'report_viewer',
  is_active   BOOLEAN    DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, crusher_id)
);

-- 3. Seed: migrate existing company_config into crushers
INSERT INTO crushers (
  name, legal_name, gstin, pan, address, city, state, pincode, phone, email,
  logo_url, bank_name, bank_account, bank_ifsc, bank_branch,
  invoice_prefix, invoice_counter, quarry_invoice_prefix, quarry_invoice_counter, terms_conditions
)
SELECT
  COALESCE(company_name, 'Main Plant'), company_name, gstin, pan, address, city, state, pincode, phone, email,
  logo_url, bank_name, bank_account, bank_ifsc, bank_branch,
  COALESCE(invoice_prefix, 'INV'), COALESCE(invoice_counter, 1),
  COALESCE(quarry_invoice_prefix, 'QRY'), COALESCE(quarry_invoice_counter, 1), terms_conditions
FROM company_config
LIMIT 1
ON CONFLICT DO NOTHING;

-- 4. If no company_config exists yet, insert a placeholder crusher
INSERT INTO crushers (name) SELECT 'Main Plant' WHERE NOT EXISTS (SELECT 1 FROM crushers);

-- 5. Grant all existing users access to the default crusher (admin role for admins, their existing role otherwise)
INSERT INTO user_crusher_access (user_id, crusher_id, role)
SELECT u.id, c.id, u.role
FROM users u
CROSS JOIN (SELECT id FROM crushers LIMIT 1) c
ON CONFLICT (user_id, crusher_id) DO NOTHING;

-- 6. Add crusher_id FK columns to all operational tables (nullable for migration safety)
ALTER TABLE sales               ADD COLUMN IF NOT EXISTS crusher_id UUID REFERENCES crushers(id);
ALTER TABLE purchases           ADD COLUMN IF NOT EXISTS crusher_id UUID REFERENCES crushers(id);
ALTER TABLE quarry_sales        ADD COLUMN IF NOT EXISTS crusher_id UUID REFERENCES crushers(id);
ALTER TABLE parties             ADD COLUMN IF NOT EXISTS crusher_id UUID REFERENCES crushers(id);
ALTER TABLE vehicles            ADD COLUMN IF NOT EXISTS crusher_id UUID REFERENCES crushers(id);
ALTER TABLE products            ADD COLUMN IF NOT EXISTS crusher_id UUID REFERENCES crushers(id);
ALTER TABLE workers             ADD COLUMN IF NOT EXISTS crusher_id UUID REFERENCES crushers(id);
ALTER TABLE assets              ADD COLUMN IF NOT EXISTS crusher_id UUID REFERENCES crushers(id);
ALTER TABLE ledger_transactions ADD COLUMN IF NOT EXISTS crusher_id UUID REFERENCES crushers(id);
ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS crusher_id UUID REFERENCES crushers(id);
ALTER TABLE attendance          ADD COLUMN IF NOT EXISTS crusher_id UUID REFERENCES crushers(id);
ALTER TABLE cameras             ADD COLUMN IF NOT EXISTS crusher_id UUID REFERENCES crushers(id);
ALTER TABLE notifications       ADD COLUMN IF NOT EXISTS crusher_id UUID REFERENCES crushers(id);
ALTER TABLE wage_payments       ADD COLUMN IF NOT EXISTS crusher_id UUID REFERENCES crushers(id);

-- 7. Back-fill all existing rows to point to the default crusher
UPDATE sales               SET crusher_id = (SELECT id FROM crushers ORDER BY created_at LIMIT 1) WHERE crusher_id IS NULL;
UPDATE purchases           SET crusher_id = (SELECT id FROM crushers ORDER BY created_at LIMIT 1) WHERE crusher_id IS NULL;
UPDATE quarry_sales        SET crusher_id = (SELECT id FROM crushers ORDER BY created_at LIMIT 1) WHERE crusher_id IS NULL;
UPDATE parties             SET crusher_id = (SELECT id FROM crushers ORDER BY created_at LIMIT 1) WHERE crusher_id IS NULL;
UPDATE vehicles            SET crusher_id = (SELECT id FROM crushers ORDER BY created_at LIMIT 1) WHERE crusher_id IS NULL;
UPDATE products            SET crusher_id = (SELECT id FROM crushers ORDER BY created_at LIMIT 1) WHERE crusher_id IS NULL;
UPDATE workers             SET crusher_id = (SELECT id FROM crushers ORDER BY created_at LIMIT 1) WHERE crusher_id IS NULL;
UPDATE assets              SET crusher_id = (SELECT id FROM crushers ORDER BY created_at LIMIT 1) WHERE crusher_id IS NULL;
UPDATE ledger_transactions SET crusher_id = (SELECT id FROM crushers ORDER BY created_at LIMIT 1) WHERE crusher_id IS NULL;
UPDATE maintenance_records SET crusher_id = (SELECT id FROM crushers ORDER BY created_at LIMIT 1) WHERE crusher_id IS NULL;
UPDATE attendance          SET crusher_id = (SELECT id FROM crushers ORDER BY created_at LIMIT 1) WHERE crusher_id IS NULL;
UPDATE cameras             SET crusher_id = (SELECT id FROM crushers ORDER BY created_at LIMIT 1) WHERE crusher_id IS NULL;
UPDATE notifications       SET crusher_id = (SELECT id FROM crushers ORDER BY created_at LIMIT 1) WHERE crusher_id IS NULL;
UPDATE wage_payments       SET crusher_id = (SELECT id FROM crushers ORDER BY created_at LIMIT 1) WHERE crusher_id IS NULL;

-- 8. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sales_crusher               ON sales(crusher_id);
CREATE INDEX IF NOT EXISTS idx_purchases_crusher           ON purchases(crusher_id);
CREATE INDEX IF NOT EXISTS idx_quarry_sales_crusher        ON quarry_sales(crusher_id);
CREATE INDEX IF NOT EXISTS idx_parties_crusher             ON parties(crusher_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_crusher            ON vehicles(crusher_id);
CREATE INDEX IF NOT EXISTS idx_workers_crusher             ON workers(crusher_id);
CREATE INDEX IF NOT EXISTS idx_ledger_crusher              ON ledger_transactions(crusher_id);
CREATE INDEX IF NOT EXISTS idx_user_crusher_access_user    ON user_crusher_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_crusher_access_crusher ON user_crusher_access(crusher_id);
