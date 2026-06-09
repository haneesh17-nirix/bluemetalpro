-- ============================================================
-- BlueMetal Pro v1.1.0 — Weighbridge & Camera Tables
-- ============================================================

-- Add weighbridge ticket counter to company config
ALTER TABLE company_config
  ADD COLUMN IF NOT EXISTS weighbridge_ticket_counter INTEGER DEFAULT 0;

-- ─── Weighbridges ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS weighbridges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) DEFAULT 'serial',  -- serial | ip | cloud
  com_port VARCHAR(20),               -- e.g. COM3, /dev/ttyUSB0
  baud_rate INTEGER DEFAULT 9600,
  ip_address VARCHAR(45),
  ip_port INTEGER,
  max_capacity_kg INTEGER DEFAULT 60000,
  location_label VARCHAR(100),
  sort_order INTEGER DEFAULT 0,
  api_key TEXT NOT NULL,              -- used by edge agent to authenticate
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Live weight state (one row per weighbridge, upserted by edge agent)
CREATE TABLE IF NOT EXISTS weighbridge_live (
  weighbridge_id UUID PRIMARY KEY REFERENCES weighbridges(id) ON DELETE CASCADE,
  weight_kg DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'unknown',
  raw_string TEXT,
  vehicle_number VARCHAR(20),
  captured_at TIMESTAMPTZ DEFAULT now()
);

-- Weigh tickets
CREATE TABLE IF NOT EXISTS weigh_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_number VARCHAR(30) UNIQUE NOT NULL,
  weighbridge_id UUID REFERENCES weighbridges(id),
  vehicle_id UUID REFERENCES vehicles(id),
  vehicle_number VARCHAR(20),
  party_id UUID REFERENCES parties(id),
  party_name VARCHAR(200),
  product_id UUID REFERENCES products(id),
  product_name VARCHAR(100),
  gross_weight_kg DECIMAL(10,2) NOT NULL,
  tare_weight_kg DECIMAL(10,2) DEFAULT 0,
  net_weight_kg DECIMAL(10,2) NOT NULL,
  net_weight_mt DECIMAL(10,3) NOT NULL,  -- net_weight_kg / 1000
  sale_id UUID REFERENCES sales(id),     -- linked after dispatch
  operator_id UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_weigh_tickets_date ON weigh_tickets(created_at);
CREATE INDEX IF NOT EXISTS idx_weigh_tickets_vehicle ON weigh_tickets(vehicle_number);
CREATE INDEX IF NOT EXISTS idx_weigh_tickets_party ON weigh_tickets(party_id);

-- ─── Cameras ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cameras (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  location_label VARCHAR(100),
  rtsp_url TEXT NOT NULL,             -- source RTSP stream
  hls_url TEXT,                       -- transcoded HLS .m3u8 URL from MediaMTX
  thumbnail_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
