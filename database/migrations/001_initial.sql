-- ============================================================
-- STONE CRUSHER APP — INITIAL DATABASE SCHEMA
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- USERS & ROLES
-- ============================================================

CREATE TYPE user_role AS ENUM (
  'admin',
  'sales_operator',
  'report_viewer',
  'vehicle_manager',
  'quarry_operator',
  'accounts'
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  phone VARCHAR(15),
  password_hash TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'report_viewer',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  device_info TEXT,
  fcm_token TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- COMPANY / GST CONFIGURATION
-- ============================================================

CREATE TABLE company_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name VARCHAR(200) NOT NULL,
  gstin VARCHAR(15),
  pan VARCHAR(10),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(6),
  phone VARCHAR(15),
  email VARCHAR(150),
  logo_url TEXT,
  bank_name VARCHAR(100),
  bank_account VARCHAR(20),
  bank_ifsc VARCHAR(11),
  bank_branch VARCHAR(100),
  invoice_prefix VARCHAR(10) DEFAULT 'INV',
  invoice_counter INTEGER DEFAULT 1,
  quarry_invoice_prefix VARCHAR(10) DEFAULT 'QRY',
  quarry_invoice_counter INTEGER DEFAULT 1,
  terms_conditions TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PRODUCTS / ITEMS
-- ============================================================

CREATE TYPE product_category AS ENUM (
  'm_sand', 'p_sand', 'aggregates', 'dust', 'gsb', 'boulder', 'other'
);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) UNIQUE,
  category product_category NOT NULL,
  unit VARCHAR(20) DEFAULT 'MT',   -- MT, CFT, LOADS, NOS
  hsn_code VARCHAR(10),
  gst_rate DECIMAL(5,2) DEFAULT 5.00,  -- percentage
  default_sale_price DECIMAL(12,2),
  default_purchase_price DECIMAL(12,2),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default products
INSERT INTO products (name, code, category, unit, hsn_code, gst_rate) VALUES
  ('M-Sand', 'MSAND', 'm_sand', 'MT', '25171010', 5.00),
  ('P-Sand (Plastering Sand)', 'PSAND', 'p_sand', 'MT', '25171010', 5.00),
  ('20mm Chilli (Aggregates)', '20MM', 'aggregates', 'MT', '25171010', 5.00),
  ('40mm Aggregates', '40MM', 'aggregates', 'MT', '25171010', 5.00),
  ('12mm Aggregates', '12MM', 'aggregates', 'MT', '25171010', 5.00),
  ('6mm Aggregates', '6MM', 'aggregates', 'MT', '25171010', 5.00),
  ('Dust / Stone Dust', 'DUST', 'dust', 'MT', '25171010', 5.00),
  ('GSB (Graded Stone Base)', 'GSB', 'gsb', 'MT', '25171010', 5.00),
  ('Boulder / Bollar', 'BOLLAR', 'boulder', 'MT', '25171010', 5.00),
  ('WMM (Wet Mix Macadam)', 'WMM', 'gsb', 'MT', '25171010', 5.00);

-- ============================================================
-- PARTIES (CUSTOMERS & SUPPLIERS)
-- ============================================================

CREATE TYPE party_type AS ENUM ('customer', 'supplier', 'both');

CREATE TABLE parties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  type party_type NOT NULL DEFAULT 'customer',
  gstin VARCHAR(15),
  pan VARCHAR(10),
  phone VARCHAR(15),
  email VARCHAR(150),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(6),
  credit_limit DECIMAL(14,2) DEFAULT 0,
  opening_balance DECIMAL(14,2) DEFAULT 0,  -- positive = receivable, negative = payable
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- VEHICLES
-- ============================================================

CREATE TYPE vehicle_status AS ENUM ('active', 'maintenance', 'retired');

CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  registration_number VARCHAR(20) UNIQUE NOT NULL,
  vehicle_type VARCHAR(50),  -- Tipper, Tractor, JCB, etc.
  owner_name VARCHAR(100),
  owner_phone VARCHAR(15),
  capacity_mt DECIMAL(8,2),  -- capacity in MT
  status vehicle_status DEFAULT 'active',
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- SALES
-- ============================================================

CREATE TYPE invoice_type AS ENUM ('tax_invoice', 'delivery_challan', 'bill_of_supply');
CREATE TYPE payment_mode AS ENUM ('cash', 'upi', 'cheque', 'neft', 'rtgs', 'credit');
CREATE TYPE sale_status AS ENUM ('draft', 'confirmed', 'cancelled');

CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number VARCHAR(30) UNIQUE NOT NULL,
  invoice_type invoice_type DEFAULT 'tax_invoice',
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  party_id UUID REFERENCES parties(id),
  party_name VARCHAR(200),  -- denormalized for flexibility
  party_gstin VARCHAR(15),
  party_address TEXT,
  vehicle_id UUID REFERENCES vehicles(id),
  vehicle_number VARCHAR(20),
  driver_name VARCHAR(100),
  do_number VARCHAR(50),  -- Delivery Order number
  status sale_status DEFAULT 'confirmed',
  subtotal DECIMAL(14,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(14,2) DEFAULT 0,
  taxable_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  cgst_amount DECIMAL(14,2) DEFAULT 0,
  sgst_amount DECIMAL(14,2) DEFAULT 0,
  igst_amount DECIMAL(14,2) DEFAULT 0,
  total_tax DECIMAL(14,2) DEFAULT 0,
  grand_total DECIMAL(14,2) NOT NULL DEFAULT 0,
  amount_received DECIMAL(14,2) DEFAULT 0,
  payment_mode payment_mode DEFAULT 'credit',
  payment_reference VARCHAR(100),
  balance_due DECIMAL(14,2) DEFAULT 0,
  notes TEXT,
  is_quarry_sale BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name VARCHAR(100) NOT NULL,
  hsn_code VARCHAR(10),
  unit VARCHAR(20),
  quantity DECIMAL(12,3) NOT NULL,
  rate DECIMAL(12,2) NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  gst_rate DECIMAL(5,2) DEFAULT 5.00,
  cgst_rate DECIMAL(5,2) DEFAULT 0,
  sgst_rate DECIMAL(5,2) DEFAULT 0,
  igst_rate DECIMAL(5,2) DEFAULT 0,
  cgst_amount DECIMAL(14,2) DEFAULT 0,
  sgst_amount DECIMAL(14,2) DEFAULT 0,
  igst_amount DECIMAL(14,2) DEFAULT 0,
  total_amount DECIMAL(14,2) NOT NULL,
  sort_order INTEGER DEFAULT 0
);

-- ============================================================
-- PURCHASES
-- ============================================================

CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bill_number VARCHAR(50),
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  party_id UUID REFERENCES parties(id),
  party_name VARCHAR(200),
  vehicle_id UUID REFERENCES vehicles(id),
  vehicle_number VARCHAR(20),
  subtotal DECIMAL(14,2) DEFAULT 0,
  taxable_amount DECIMAL(14,2) DEFAULT 0,
  cgst_amount DECIMAL(14,2) DEFAULT 0,
  sgst_amount DECIMAL(14,2) DEFAULT 0,
  igst_amount DECIMAL(14,2) DEFAULT 0,
  grand_total DECIMAL(14,2) NOT NULL DEFAULT 0,
  amount_paid DECIMAL(14,2) DEFAULT 0,
  payment_mode payment_mode DEFAULT 'credit',
  balance_due DECIMAL(14,2) DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE purchase_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_id UUID REFERENCES purchases(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name VARCHAR(100) NOT NULL,
  unit VARCHAR(20),
  quantity DECIMAL(12,3) NOT NULL,
  rate DECIMAL(12,2) NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  gst_rate DECIMAL(5,2) DEFAULT 0,
  cgst_amount DECIMAL(14,2) DEFAULT 0,
  sgst_amount DECIMAL(14,2) DEFAULT 0,
  igst_amount DECIMAL(14,2) DEFAULT 0,
  total_amount DECIMAL(14,2) NOT NULL
);

-- ============================================================
-- PAYMENTS & RECEIPTS
-- ============================================================

CREATE TYPE txn_type AS ENUM ('receipt', 'payment', 'journal');

CREATE TABLE ledger_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  txn_type txn_type NOT NULL,
  txn_date DATE NOT NULL DEFAULT CURRENT_DATE,
  party_id UUID REFERENCES parties(id),
  reference_id UUID,  -- sale_id or purchase_id
  reference_type VARCHAR(20),  -- 'sale' | 'purchase'
  amount DECIMAL(14,2) NOT NULL,
  payment_mode payment_mode DEFAULT 'cash',
  cheque_number VARCHAR(50),
  cheque_date DATE,
  bank_name VARCHAR(100),
  narration TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- RAW MATERIALS STOCK
-- ============================================================

CREATE TABLE raw_material_stock (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  opening_stock DECIMAL(12,3) DEFAULT 0,
  received DECIMAL(12,3) DEFAULT 0,
  consumed DECIMAL(12,3) DEFAULT 0,
  closing_stock DECIMAL(12,3) DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- QUARRY SALES
-- ============================================================

CREATE TABLE quarry_sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number VARCHAR(30) UNIQUE NOT NULL,
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  party_id UUID REFERENCES parties(id),
  party_name VARCHAR(200),
  vehicle_id UUID REFERENCES vehicles(id),
  vehicle_number VARCHAR(20),
  product_id UUID REFERENCES products(id),
  product_name VARCHAR(100),
  quantity DECIMAL(12,3) NOT NULL,
  unit VARCHAR(20) DEFAULT 'MT',
  rate DECIMAL(12,2) NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  royalty_rate DECIMAL(12,2) DEFAULT 0,
  royalty_amount DECIMAL(14,2) DEFAULT 0,
  grand_total DECIMAL(14,2) NOT NULL,
  amount_received DECIMAL(14,2) DEFAULT 0,
  payment_mode payment_mode DEFAULT 'cash',
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- MAINTENANCE
-- ============================================================

CREATE TYPE asset_type AS ENUM ('machinery', 'vehicle');
CREATE TYPE maintenance_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');

CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_type asset_type NOT NULL,
  name VARCHAR(100) NOT NULL,
  model VARCHAR(100),
  serial_number VARCHAR(100),
  purchase_date DATE,
  purchase_cost DECIMAL(14,2),
  vehicle_id UUID REFERENCES vehicles(id),  -- link if asset is a vehicle
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE maintenance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id UUID REFERENCES assets(id),
  asset_type asset_type NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  scheduled_date DATE,
  completed_date DATE,
  status maintenance_status DEFAULT 'scheduled',
  cost DECIMAL(12,2) DEFAULT 0,
  vendor_name VARCHAR(100),
  vendor_phone VARCHAR(15),
  parts_replaced TEXT,
  next_service_date DATE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- WAGES / RESOURCES
-- ============================================================

CREATE TYPE wage_type AS ENUM ('daily', 'monthly', 'piece_rate', 'hourly');

CREATE TABLE workers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(15),
  designation VARCHAR(100),
  wage_type wage_type DEFAULT 'daily',
  wage_rate DECIMAL(10,2) NOT NULL DEFAULT 0,
  joining_date DATE,
  aadhaar VARCHAR(12),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'half_day', 'leave');

CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id UUID REFERENCES workers(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status attendance_status DEFAULT 'present',
  overtime_hours DECIMAL(5,2) DEFAULT 0,
  advance DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(worker_id, date)
);

CREATE TABLE wage_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id UUID REFERENCES workers(id),
  period_from DATE NOT NULL,
  period_to DATE NOT NULL,
  days_worked DECIMAL(5,2),
  gross_wages DECIMAL(12,2),
  deductions DECIMAL(12,2) DEFAULT 0,
  advances_deducted DECIMAL(12,2) DEFAULT 0,
  net_wages DECIMAL(12,2),
  payment_date DATE,
  payment_mode payment_mode DEFAULT 'cash',
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- NOTIFICATIONS LOG
-- ============================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  title VARCHAR(200) NOT NULL,
  body TEXT,
  type VARCHAR(50),  -- 'sale', 'payment', 'maintenance', 'quarry'
  reference_id UUID,
  is_read BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_sales_date ON sales(sale_date);
CREATE INDEX idx_sales_party ON sales(party_id);
CREATE INDEX idx_sales_vehicle ON sales(vehicle_id);
CREATE INDEX idx_sale_items_product ON sale_items(product_id);
CREATE INDEX idx_purchases_date ON purchases(purchase_date);
CREATE INDEX idx_ledger_party ON ledger_transactions(party_id);
CREATE INDEX idx_ledger_date ON ledger_transactions(txn_date);
CREATE INDEX idx_attendance_worker_date ON attendance(worker_id, date);
CREATE INDEX idx_quarry_date ON quarry_sales(sale_date);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);

-- ============================================================
-- VIEWS
-- ============================================================

-- Party ledger balance
CREATE VIEW party_balances AS
SELECT
  p.id,
  p.name,
  p.type,
  p.opening_balance,
  COALESCE(SUM(CASE WHEN lt.txn_type = 'receipt' THEN -lt.amount
                    WHEN lt.txn_type = 'payment' THEN lt.amount
                    ELSE 0 END), 0) AS txn_balance,
  p.opening_balance + COALESCE(SUM(CASE
    WHEN lt.txn_type = 'receipt' THEN -lt.amount
    WHEN lt.txn_type = 'payment' THEN lt.amount
    ELSE 0 END), 0) + COALESCE((
      SELECT SUM(balance_due) FROM sales s WHERE s.party_id = p.id AND s.status = 'confirmed'
    ), 0) AS total_balance
FROM parties p
LEFT JOIN ledger_transactions lt ON lt.party_id = p.id
GROUP BY p.id, p.name, p.type, p.opening_balance;

-- Item-wise sales summary
CREATE VIEW item_wise_sales AS
SELECT
  pr.name AS product_name,
  pr.category,
  pr.unit,
  SUM(si.quantity) AS total_quantity,
  SUM(si.amount) AS total_amount,
  SUM(si.total_amount) AS total_with_gst,
  COUNT(DISTINCT si.sale_id) AS num_invoices,
  DATE_TRUNC('month', s.sale_date) AS month
FROM sale_items si
JOIN sales s ON s.id = si.sale_id AND s.status = 'confirmed'
JOIN products pr ON pr.id = si.product_id
GROUP BY pr.name, pr.category, pr.unit, DATE_TRUNC('month', s.sale_date);
