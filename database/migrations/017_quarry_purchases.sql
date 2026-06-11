-- Quarry purchases: stone/raw material bought by the crusher from mines/quarry owners
CREATE TABLE IF NOT EXISTS quarry_purchases (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_date    DATE NOT NULL,
  supplier_name    VARCHAR(200) NOT NULL,
  product_name     VARCHAR(200) NOT NULL,
  quantity         NUMERIC(12,3) NOT NULL CHECK (quantity > 0),
  unit             VARCHAR(20) NOT NULL DEFAULT 'MT',
  rate             NUMERIC(12,2) NOT NULL CHECK (rate >= 0),
  amount           NUMERIC(14,2) GENERATED ALWAYS AS (quantity * rate) STORED,
  royalty_rate     NUMERIC(10,2) NOT NULL DEFAULT 0,
  royalty_amount   NUMERIC(14,2) GENERATED ALWAYS AS (quantity * royalty_rate) STORED,
  grand_total      NUMERIC(14,2) GENERATED ALWAYS AS (quantity * rate + quantity * royalty_rate) STORED,
  vehicle_number   VARCHAR(50),
  payment_mode     VARCHAR(30) NOT NULL DEFAULT 'cash',
  notes            TEXT,
  created_by       UUID REFERENCES users(id),
  crusher_id       UUID REFERENCES crushers(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quarry_purchases_crusher  ON quarry_purchases(crusher_id);
CREATE INDEX IF NOT EXISTS idx_quarry_purchases_date     ON quarry_purchases(purchase_date);
