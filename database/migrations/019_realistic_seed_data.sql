-- ============================================================
-- 019_realistic_seed_data.sql
-- Wipe all operational/test data and reload with realistic
-- demo data that exercises every app flow.
-- Safe to re-run (truncates first).
-- ============================================================

-- ── 0. Wipe all operational data (preserve schema & products) ─────────────
TRUNCATE TABLE
  quarry_purchases,
  quarry_sales,
  wage_payments,
  attendance,
  workers,
  maintenance_records,
  assets,
  ledger_transactions,
  purchase_items,
  purchases,
  sale_items,
  sales,
  weighbridge_live,
  weigh_tickets,
  parties,
  vehicles,
  notifications,
  user_sessions
CASCADE;

-- Remove old test users (keep platform_admin)
DELETE FROM user_crusher_access;
DELETE FROM user_tenant_access;
DELETE FROM users WHERE email NOT LIKE '%@bluemetal.local';

-- Wipe crushers & tenants (we'll rebuild cleanly)
-- products.crusher_id → crushers.id FK must be cleared before deleting crushers
UPDATE products SET crusher_id = NULL;
DELETE FROM crushers;
DELETE FROM tenants;
DELETE FROM company_config;

-- Reset product default prices so reports look real
UPDATE products SET
  default_sale_price     = CASE code
    WHEN 'MSAND'  THEN 850.00
    WHEN 'PSAND'  THEN 780.00
    WHEN '20MM'   THEN 920.00
    WHEN '40MM'   THEN 880.00
    WHEN '12MM'   THEN 960.00
    WHEN '6MM'    THEN 1000.00
    WHEN 'DUST'   THEN 400.00
    WHEN 'GSB'    THEN 750.00
    WHEN 'BOLLAR' THEN 650.00
    WHEN 'WMM'    THEN 820.00
    ELSE default_sale_price
  END,
  default_purchase_price = CASE code
    WHEN 'MSAND'  THEN 520.00
    WHEN 'PSAND'  THEN 480.00
    WHEN '20MM'   THEN 560.00
    WHEN '40MM'   THEN 530.00
    WHEN '12MM'   THEN 590.00
    WHEN '6MM'    THEN 620.00
    WHEN 'DUST'   THEN 200.00
    WHEN 'GSB'    THEN 440.00
    WHEN 'BOLLAR' THEN 380.00
    WHEN 'WMM'    THEN 490.00
    ELSE default_purchase_price
  END;

-- ── 1. TENANT ─────────────────────────────────────────────────────────────
INSERT INTO tenants (id, name, legal_name, gstin, pan, city, state, phone, email, plan, is_active)
VALUES (
  '11111111-0000-0000-0000-000000000001',
  'BlueMetal Aggregates',
  'BlueMetal Aggregates Pvt Ltd',
  '29AABCB1234F1Z5',
  'AABCB1234F',
  'Bengaluru',
  'Karnataka',
  '9876500001',
  'info@bluemetal.in',
  'standard',
  true
);

-- ── 2. CRUSHERS (two plants under one tenant) ─────────────────────────────
INSERT INTO crushers (
  id, tenant_id, name, legal_name, gstin, pan,
  address, city, state, state_code, pincode, phone, email,
  bank_name, bank_account, bank_ifsc, bank_branch,
  invoice_prefix, invoice_counter,
  quarry_invoice_prefix, quarry_invoice_counter,
  terms_conditions, is_active
) VALUES
(
  '22222222-0000-0000-0000-000000000001',
  '11111111-0000-0000-0000-000000000001',
  'Hosur Road Plant',
  'BlueMetal Aggregates Pvt Ltd',
  '29AABCB1234F1Z5',
  'AABCB1234F',
  'Survey No. 45, Hosur Road, Bommasandra', 'Bengaluru', 'Karnataka', '29', '560099',
  '9876500010', 'hosur@bluemetal.in',
  'State Bank of India', '39284710234', 'SBIN0012345', 'Bommasandra Industrial Area',
  'BMP', 1, 'QMP', 1,
  'Goods once sold will not be taken back. All disputes subject to Bengaluru jurisdiction.',
  true
),
(
  '22222222-0000-0000-0000-000000000002',
  '11111111-0000-0000-0000-000000000001',
  'Tumkur Highway Plant',
  'BlueMetal Aggregates Pvt Ltd',
  '29AABCB5678G1Z3',
  'AABCB1234F',
  'NH-48, Km 32, Nelamangala', 'Tumkur', 'Karnataka', '29', '572102',
  '9876500020', 'tumkur@bluemetal.in',
  'Canara Bank', '1234500987654', 'CNRB0003456', 'Nelamangala Branch',
  'BMT', 1, 'QMT', 1,
  'Goods once sold will not be taken back. All disputes subject to Bengaluru jurisdiction.',
  true
);

-- Re-link products to the primary crusher after crusher table was rebuilt
UPDATE products SET crusher_id = '22222222-0000-0000-0000-000000000001' WHERE crusher_id IS NULL;

-- ── 3. USERS (one per role, plus one extra operations user) ───────────────
-- Password for all: Test@1234
-- Hash: $2a$10$uExSDVxMC/KADd3jiPZTz.SgF7qUlrOX0MNPrK5g6Qisma2T3QgZy
DO $$
DECLARE
  v_plant1_id   UUID := '22222222-0000-0000-0000-000000000001';
  v_plant2_id   UUID := '22222222-0000-0000-0000-000000000002';
  v_tenant_id   UUID := '11111111-0000-0000-0000-000000000001';
  pw_hash     TEXT := '$2a$10$uExSDVxMC/KADd3jiPZTz.SgF7qUlrOX0MNPrK5g6Qisma2T3QgZy';
  -- resolved after insert so ON CONFLICT DO UPDATE (which preserves old UUIDs) is accounted for
  admin_id    UUID;
  ops1_id     UUID;
  ops2_id     UUID;
  viewer_id   UUID;
  platform_id UUID;
BEGIN
  INSERT INTO users (id, name, email, password_hash, role, is_active) VALUES
    (gen_random_uuid(), 'Rajesh Kumar (Admin)',    'admin@bluemetal.local',    pw_hash, 'admin',         true),
    (gen_random_uuid(), 'Suresh Naik (Operator)',  'ops@bluemetal.local',      pw_hash, 'operations',    true),
    (gen_random_uuid(), 'Priya Menon (Operator)',  'ops2@bluemetal.local',     pw_hash, 'operations',    true),
    (gen_random_uuid(), 'Ananya Sharma (Reports)', 'reports@bluemetal.local',  pw_hash, 'report_viewer', true),
    (gen_random_uuid(), 'Platform Admin',          'platform@bluemetal.local', pw_hash, 'admin',         true)
  ON CONFLICT (email) DO UPDATE SET
    name          = EXCLUDED.name,
    password_hash = EXCLUDED.password_hash,
    role          = EXCLUDED.role,
    is_active     = EXCLUDED.is_active;

  -- Resolve actual UUIDs (ON CONFLICT DO UPDATE preserves the existing UUID)
  SELECT id INTO admin_id    FROM users WHERE email = 'admin@bluemetal.local';
  SELECT id INTO ops1_id     FROM users WHERE email = 'ops@bluemetal.local';
  SELECT id INTO ops2_id     FROM users WHERE email = 'ops2@bluemetal.local';
  SELECT id INTO viewer_id   FROM users WHERE email = 'reports@bluemetal.local';
  SELECT id INTO platform_id FROM users WHERE email = 'platform@bluemetal.local';

  -- platform_admin flag
  UPDATE users SET is_platform_admin = true WHERE id = platform_id;

  -- tenant access
  INSERT INTO user_tenant_access (user_id, tenant_id, role) VALUES
    (admin_id,   v_tenant_id, 'admin'),
    (ops1_id,    v_tenant_id, 'operations'),
    (ops2_id,    v_tenant_id, 'operations'),
    (viewer_id,  v_tenant_id, 'report_viewer')
  ON CONFLICT (user_id, tenant_id) DO NOTHING;

  -- crusher access
  INSERT INTO user_crusher_access (user_id, crusher_id, role) VALUES
    (admin_id,  v_plant1_id, 'admin'),
    (admin_id,  v_plant2_id, 'admin'),
    (ops1_id,   v_plant1_id, 'operations'),
    (ops2_id,   v_plant2_id, 'operations'),
    (viewer_id, v_plant1_id, 'report_viewer'),
    (viewer_id, v_plant2_id, 'report_viewer')
  ON CONFLICT (user_id, crusher_id) DO NOTHING;
END;
$$;

-- ── 4. VEHICLES (Hosur Plant) ─────────────────────────────────────────────
INSERT INTO vehicles (id, registration_number, vehicle_type, owner_name, owner_phone, capacity_mt, status, crusher_id) VALUES
  ('33333333-0000-0000-0000-000000000001', 'KA-01-AA-1234', 'Tipper',  'Manjunath S',   '9845001001', 16.0, 'active', '22222222-0000-0000-0000-000000000001'),
  ('33333333-0000-0000-0000-000000000002', 'KA-01-AB-5678', 'Tipper',  'Ravi Kumar',    '9845001002', 18.0, 'active', '22222222-0000-0000-0000-000000000001'),
  ('33333333-0000-0000-0000-000000000003', 'KA-02-AC-9012', 'Tipper',  'Venkatesh B',   '9845001003', 20.0, 'active', '22222222-0000-0000-0000-000000000001'),
  ('33333333-0000-0000-0000-000000000004', 'KA-03-AD-3456', 'Tractor', 'Nagesh P',      '9845001004', 10.0, 'active', '22222222-0000-0000-0000-000000000001'),
  ('33333333-0000-0000-0000-000000000005', 'KA-04-AE-7890', 'Tipper',  'Suresh Reddy',  '9845001005', 18.0, 'maintenance', '22222222-0000-0000-0000-000000000001'),
  -- Tumkur Plant
  ('33333333-0000-0000-0000-000000000006', 'KA-05-AF-2345', 'Tipper',  'Krishnamurthy', '9845001006', 16.0, 'active', '22222222-0000-0000-0000-000000000002'),
  ('33333333-0000-0000-0000-000000000007', 'KA-06-AG-6789', 'Tipper',  'Basavaraj M',   '9845001007', 20.0, 'active', '22222222-0000-0000-0000-000000000002');

-- ── 5. PARTIES ────────────────────────────────────────────────────────────
-- Plant 1 parties
INSERT INTO parties (id, name, type, gstin, phone, address, city, state, credit_limit, opening_balance, crusher_id) VALUES
  ('44444444-0000-0000-0000-000000000001', 'L&T Construction Ltd',           'customer', '29AAACL1234F1Z8', '0802345678', 'L&T House, HMT Layout', 'Bengaluru', 'Karnataka', 2000000, 125000,  '22222222-0000-0000-0000-000000000001'),
  ('44444444-0000-0000-0000-000000000002', 'Prestige Projects Pvt Ltd',      'customer', '29AABCP4567G1Z2', '0803456789', 'Prestige Tower, MG Road', 'Bengaluru', 'Karnataka', 5000000, 287500,  '22222222-0000-0000-0000-000000000001'),
  ('44444444-0000-0000-0000-000000000003', 'NHAI — NH48 Project',            'customer', '07AAAGG1234C1Z5', '0111234567', 'NHAI Office, Rajaji Nagar', 'Bengaluru', 'Karnataka', 10000000, 0,       '22222222-0000-0000-0000-000000000001'),
  ('44444444-0000-0000-0000-000000000004', 'Shapoorji Pallonji & Co',        'customer', '27AABCS3456H1Z9', '0224567890', 'SP House, Wankhede', 'Bengaluru', 'Karnataka', 3000000, 54200,   '22222222-0000-0000-0000-000000000001'),
  ('44444444-0000-0000-0000-000000000005', 'Gangadhara & Sons (Retail)',     'customer', NULL,              '9845002001', 'Near Old Bus Stand', 'Bengaluru', 'Karnataka', 500000,  0,       '22222222-0000-0000-0000-000000000001'),
  -- supplier
  ('44444444-0000-0000-0000-000000000006', 'Deccan Mining Co',               'supplier', '29AABCD7890K1Z1', '9845003001', 'Quarry Village, Ramanagara', 'Ramanagara', 'Karnataka', 0, 0,    '22222222-0000-0000-0000-000000000001'),
  -- Plant 2 parties
  ('44444444-0000-0000-0000-000000000007', 'BMRCL (Metro Rail Corp)',        'customer', '29AABCB9012L1Z4', '0807890123', 'Metro Bhawan, Sampige Road', 'Bengaluru', 'Karnataka', 8000000, 430000,  '22222222-0000-0000-0000-000000000002'),
  ('44444444-0000-0000-0000-000000000008', 'Sobha Developers Ltd',           'customer', '29AABCS5678M1Z7', '0804567890', 'Sobha Towers, Hebbal', 'Bengaluru', 'Karnataka', 3000000, 210000,  '22222222-0000-0000-0000-000000000002');

-- ── 6. ASSETS & MAINTENANCE ───────────────────────────────────────────────
INSERT INTO assets (id, asset_type, name, model, serial_number, purchase_date, purchase_cost, crusher_id) VALUES
  ('aaaaaaaa-1000-0000-0000-000000000001', 'machinery', 'Jaw Crusher — Primary',    'Metso C110',    'MC110-2021-0045', '2021-03-15', 4200000, '22222222-0000-0000-0000-000000000001'),
  ('aaaaaaaa-1000-0000-0000-000000000002', 'machinery', 'VSI Crusher — M-Sand',     'Terex Canica',  'TC2022-0089',    '2022-07-01', 2800000, '22222222-0000-0000-0000-000000000001'),
  ('aaaaaaaa-1000-0000-0000-000000000003', 'machinery', 'Vibrating Screen 3-deck',  'Haver & Boeck', 'HB-SCR-0031',    '2020-11-20', 1500000, '22222222-0000-0000-0000-000000000001'),
  ('aaaaaaaa-1000-0000-0000-000000000004', 'machinery', 'Conveyor Belt System',     'Fenner India',  'FEN-CVB-2020-7', '2020-11-20', 850000,  '22222222-0000-0000-0000-000000000001'),
  ('aaaaaaaa-1000-0000-0000-000000000005', 'vehicle',   'JCB 3DX Backhoe',          'JCB 3DX',       'JCB3DX-2023-012','2023-01-10', 1800000, '22222222-0000-0000-0000-000000000001'),
  ('aaaaaaaa-1000-0000-0000-000000000006', 'machinery', 'Cone Crusher — Secondary', 'Sandvik CS430', 'SVKCS-2022-017', '2022-04-01', 3600000, '22222222-0000-0000-0000-000000000002');

INSERT INTO maintenance_records (asset_id, asset_type, title, description, scheduled_date, completed_date, status, cost, vendor_name, next_service_date, crusher_id) VALUES
  -- completed
  ('aaaaaaaa-1000-0000-0000-000000000001', 'machinery', 'Jaw Plate Replacement',
   'Replaced both fixed and movable jaw plates. Checked toggle plate for wear.',
   (CURRENT_DATE - INTERVAL '45 days'), (CURRENT_DATE - INTERVAL '44 days'),
   'completed', 95000, 'Metso Service India', (CURRENT_DATE + INTERVAL '180 days'),
   '22222222-0000-0000-0000-000000000001'),

  ('aaaaaaaa-1000-0000-0000-000000000002', 'machinery', 'Quarterly Oil Change & Bearing Inspection',
   'Replaced hydraulic oil, inspected all bearings, greased all nipples.',
   (CURRENT_DATE - INTERVAL '30 days'), (CURRENT_DATE - INTERVAL '29 days'),
   'completed', 18500, 'Universal Lubricants', (CURRENT_DATE + INTERVAL '90 days'),
   '22222222-0000-0000-0000-000000000001'),

  -- scheduled (upcoming)
  ('aaaaaaaa-1000-0000-0000-000000000003', 'machinery', 'Screen Mesh Replacement',
   'Replace all 3 deck meshes — aperture worn beyond tolerance.',
   (CURRENT_DATE + INTERVAL '7 days'), NULL,
   'scheduled', 42000, 'Haver & Boecker India', (CURRENT_DATE + INTERVAL '120 days'),
   '22222222-0000-0000-0000-000000000001'),

  ('aaaaaaaa-1000-0000-0000-000000000005', 'vehicle', 'JCB Major Service (2000hr)',
   'Full engine service, hydraulic system check, bucket pin replacement.',
   (CURRENT_DATE + INTERVAL '14 days'), NULL,
   'scheduled', 55000, 'JCB India Service Centre', (CURRENT_DATE + INTERVAL '365 days'),
   '22222222-0000-0000-0000-000000000001'),

  -- in progress
  ('aaaaaaaa-1000-0000-0000-000000000004', 'machinery', 'Conveyor Belt Splice Repair',
   'Belt damaged at splice point #3. Emergency repair in progress.',
   CURRENT_DATE, NULL,
   'in_progress', 12000, 'Fenner India Ltd', NULL,
   '22222222-0000-0000-0000-000000000001');

-- ── 7. WORKERS & ATTENDANCE ───────────────────────────────────────────────
INSERT INTO workers (id, name, phone, designation, wage_type, wage_rate, joining_date, is_active, crusher_id) VALUES
  ('55555555-0000-0000-0000-000000000001', 'Ramesh Gowda',    '9741001001', 'Machine Operator', 'daily',   750.00, '2020-06-01', true, '22222222-0000-0000-0000-000000000001'),
  ('55555555-0000-0000-0000-000000000002', 'Shivappa K',      '9741001002', 'Loader Operator',  'daily',   700.00, '2021-02-15', true, '22222222-0000-0000-0000-000000000001'),
  ('55555555-0000-0000-0000-000000000003', 'Puttamma B',      '9741001003', 'Conveyor Operator','daily',   650.00, '2021-09-01', true, '22222222-0000-0000-0000-000000000001'),
  ('55555555-0000-0000-0000-000000000004', 'Nagaraju S',      '9741001004', 'Weigh Operator',   'daily',   620.00, '2022-01-10', true, '22222222-0000-0000-0000-000000000001'),
  ('55555555-0000-0000-0000-000000000005', 'Krishnappa M',    '9741001005', 'Helper',           'daily',   550.00, '2023-03-20', true, '22222222-0000-0000-0000-000000000001'),
  ('55555555-0000-0000-0000-000000000006', 'Suresh Babu T',   '9741001006', 'Supervisor',       'monthly', 28000.00,'2019-11-01',true, '22222222-0000-0000-0000-000000000001'),
  ('55555555-0000-0000-0000-000000000007', 'Venkatesha R',    '9741001007', 'Machine Operator', 'daily',   750.00, '2021-07-01', true, '22222222-0000-0000-0000-000000000002'),
  ('55555555-0000-0000-0000-000000000008', 'Lakshmipathi',    '9741001008', 'Helper',           'daily',   550.00, '2022-08-15', true, '22222222-0000-0000-0000-000000000002');

-- Attendance for last 7 working days (plant 1 workers)
DO $$
DECLARE
  d DATE;
  w UUID;
  workers1 UUID[] := ARRAY[
    '55555555-0000-0000-0000-000000000001'::UUID,
    '55555555-0000-0000-0000-000000000002'::UUID,
    '55555555-0000-0000-0000-000000000003'::UUID,
    '55555555-0000-0000-0000-000000000004'::UUID,
    '55555555-0000-0000-0000-000000000005'::UUID,
    '55555555-0000-0000-0000-000000000006'::UUID
  ];
  statuses attendance_status[] := ARRAY['present','present','present','present','half_day','absent','present'];
  i INT;
BEGIN
  FOR day_offset IN 0..6 LOOP
    d := CURRENT_DATE - (day_offset || ' days')::INTERVAL;
    IF EXTRACT(DOW FROM d) IN (0, 6) THEN CONTINUE; END IF; -- skip weekends
    i := 1;
    FOREACH w IN ARRAY workers1 LOOP
      INSERT INTO attendance (worker_id, date, status, overtime_hours, crusher_id)
      VALUES (w, d,
        CASE WHEN i = 6 AND day_offset = 2 THEN 'absent'::attendance_status
             WHEN i = 3 AND day_offset = 1 THEN 'half_day'::attendance_status
             ELSE 'present'::attendance_status END,
        CASE WHEN i IN (1,2) AND day_offset = 0 THEN 2.0 ELSE 0 END,
        '22222222-0000-0000-0000-000000000001')
      ON CONFLICT (worker_id, date) DO NOTHING;
      i := i + 1;
    END LOOP;
  END LOOP;
END;
$$;

-- Wage payment last month
INSERT INTO wage_payments (worker_id, period_from, period_to, days_worked, gross_wages, deductions, advances_deducted, net_wages, payment_date, payment_mode, crusher_id) VALUES
  ('55555555-0000-0000-0000-000000000001', DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month'), DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 day', 26, 19500, 0, 1500, 18000, DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '2 days', 'cash', '22222222-0000-0000-0000-000000000001'),
  ('55555555-0000-0000-0000-000000000002', DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month'), DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 day', 25, 17500, 0, 0,    17500, DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '2 days', 'cash', '22222222-0000-0000-0000-000000000001'),
  ('55555555-0000-0000-0000-000000000006', DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month'), DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 day', 26, 28000, 2800, 0,  25200, DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '2 days', 'neft', '22222222-0000-0000-0000-000000000001');

-- ── 8. SALES (last 60 days, plant 1) ──────────────────────────────────────
-- Helper: all sales reference plant 1, created_by admin
DO $$
DECLARE
  p1 UUID := '22222222-0000-0000-0000-000000000001';
  admin_id UUID;

  -- Product IDs (from seeded products)
  msand_id  UUID; psand_id UUID; mm20_id UUID; mm40_id UUID;
  mm12_id   UUID; dust_id  UUID; gsb_id   UUID;

  -- Party IDs
  lt_id     UUID := '44444444-0000-0000-0000-000000000001';
  pres_id   UUID := '44444444-0000-0000-0000-000000000002';
  nhai_id   UUID := '44444444-0000-0000-0000-000000000003';
  sp_id     UUID := '44444444-0000-0000-0000-000000000004';
  gang_id   UUID := '44444444-0000-0000-0000-000000000005';

  -- Vehicle IDs
  v1 UUID := '33333333-0000-0000-0000-000000000001';
  v2 UUID := '33333333-0000-0000-0000-000000000002';
  v3 UUID := '33333333-0000-0000-0000-000000000003';
  v4 UUID := '33333333-0000-0000-0000-000000000004';

  sale_id UUID;
  qty     NUMERIC;
  rate    NUMERIC;
  sub     NUMERIC;
  gst_amt NUMERIC;
  total   NUMERIC;
BEGIN
  SELECT id INTO msand_id FROM products WHERE code = 'MSAND';
  SELECT id INTO psand_id FROM products WHERE code = 'PSAND';
  SELECT id INTO mm20_id  FROM products WHERE code = '20MM';
  SELECT id INTO mm40_id  FROM products WHERE code = '40MM';
  SELECT id INTO mm12_id  FROM products WHERE code = '12MM';
  SELECT id INTO dust_id  FROM products WHERE code = 'DUST';
  SELECT id INTO gsb_id   FROM products WHERE code = 'GSB';
  SELECT id INTO admin_id FROM users WHERE email = 'admin@bluemetal.local';

  -- ── Invoice 1: L&T — M-Sand bulk (60 days ago) ──
  sale_id := gen_random_uuid();
  qty := 120.5; rate := 850; sub := qty * rate;
  gst_amt := sub * 0.05; total := sub + gst_amt;
  INSERT INTO sales VALUES (
    sale_id, 'BMP/2526/0001', 'tax_invoice',
    CURRENT_DATE - 60, lt_id, 'L&T Construction Ltd', '29AAACL1234F1Z8', 'L&T House, HMT Layout, Bengaluru',
    v1, 'KA-01-AA-1234', 'Madan Kumar', 'DO-LT-001',
    'confirmed',
    sub, 0, sub,
    gst_amt/2, gst_amt/2, 0, gst_amt,
    total, total, 'neft', 'NEFT2526060001',
    0, NULL, false, admin_id, now(), now(), p1
  );
  INSERT INTO sale_items VALUES (
    gen_random_uuid(), sale_id, msand_id, 'M-Sand', '25171010', 'MT',
    qty, rate, sub, 5.00, 2.50, 2.50, 0,
    gst_amt/2, gst_amt/2, 0, total, 1
  );
  UPDATE crushers SET invoice_counter = invoice_counter + 1 WHERE id = p1;

  -- ── Invoice 2: Prestige — 20mm Aggregates (55 days ago) ──
  sale_id := gen_random_uuid();
  qty := 85.0; rate := 920; sub := qty * rate;
  gst_amt := sub * 0.05; total := sub + gst_amt;
  INSERT INTO sales VALUES (
    sale_id, 'BMP/2526/0002', 'tax_invoice',
    CURRENT_DATE - 55, pres_id, 'Prestige Projects Pvt Ltd', '29AABCP4567G1Z2', 'Prestige Tower, MG Road, Bengaluru',
    v2, 'KA-01-AB-5678', 'Ravi Kumar', 'DO-PRE-004',
    'confirmed',
    sub, 0, sub, gst_amt/2, gst_amt/2, 0, gst_amt,
    total, 50000, 'cheque', 'CHQ-PRE-2001',
    total - 50000, NULL, false, admin_id, now(), now(), p1
  );
  INSERT INTO sale_items VALUES (
    gen_random_uuid(), sale_id, mm20_id, '20mm Chilli (Aggregates)', '25171010', 'MT',
    qty, rate, sub, 5.00, 2.50, 2.50, 0,
    gst_amt/2, gst_amt/2, 0, total, 1
  );

  -- ── Invoice 3: NHAI — GSB (50 days ago) — large govt order ──
  sale_id := gen_random_uuid();
  qty := 320.0; rate := 750; sub := qty * rate;
  gst_amt := sub * 0.05; total := sub + gst_amt;
  INSERT INTO sales VALUES (
    sale_id, 'BMP/2526/0003', 'tax_invoice',
    CURRENT_DATE - 50, nhai_id, 'NHAI — NH48 Project', '07AAAGG1234C1Z5', 'NHAI Office, Rajaji Nagar, Bengaluru',
    v3, 'KA-02-AC-9012', 'Venkatesh B', 'DO-NHAI-2526-007',
    'confirmed',
    sub, 0, sub, gst_amt/2, gst_amt/2, 0, gst_amt,
    total, total, 'rtgs', 'RTGS-NHAI-0045',
    0, NULL, false, admin_id, now(), now(), p1
  );
  INSERT INTO sale_items VALUES (
    gen_random_uuid(), sale_id, gsb_id, 'GSB (Graded Stone Base)', '25171010', 'MT',
    qty, rate, sub, 5.00, 2.50, 2.50, 0,
    gst_amt/2, gst_amt/2, 0, total, 1
  );

  -- ── Invoice 4: Gangadhara retail — M-Sand + Dust (45 days ago) ──
  sale_id := gen_random_uuid();
  qty := 18.5; rate := 850; sub := qty * rate;
  gst_amt := sub * 0.05; total := sub + gst_amt;
  INSERT INTO sales VALUES (
    sale_id, 'BMP/2526/0004', 'tax_invoice',
    CURRENT_DATE - 45, gang_id, 'Gangadhara & Sons (Retail)', NULL, 'Near Old Bus Stand, Bengaluru',
    v4, 'KA-03-AD-3456', 'Nagesh P', NULL,
    'confirmed',
    sub + (8.0 * 400), 0, sub + (8.0 * 400),
    (sub + 8.0*400) * 0.025, (sub + 8.0*400) * 0.025, 0, (sub + 8.0*400) * 0.05,
    (sub + 8.0*400) * 1.05, (sub + 8.0*400) * 1.05, 'cash', NULL,
    0, NULL, false, admin_id, now(), now(), p1
  );
  INSERT INTO sale_items VALUES
    (gen_random_uuid(), sale_id, msand_id, 'M-Sand', '25171010', 'MT',
     18.5, 850, 18.5*850, 5.00, 2.50, 2.50, 0,
     18.5*850*0.025, 18.5*850*0.025, 0, 18.5*850*1.05, 1),
    (gen_random_uuid(), sale_id, dust_id, 'Dust / Stone Dust', '25171010', 'MT',
     8.0, 400, 8.0*400, 5.00, 2.50, 2.50, 0,
     8.0*400*0.025, 8.0*400*0.025, 0, 8.0*400*1.05, 2);

  -- ── Invoice 5: Shapoorji — 40mm + P-Sand (40 days ago) ──
  sale_id := gen_random_uuid();
  qty := 65.0; rate := 880; sub := qty * rate + 45.0 * 780;
  gst_amt := sub * 0.05; total := sub + gst_amt;
  INSERT INTO sales VALUES (
    sale_id, 'BMP/2526/0005', 'tax_invoice',
    CURRENT_DATE - 40, sp_id, 'Shapoorji Pallonji & Co', '27AABCS3456H1Z9', 'SP House, Wankhede, Bengaluru',
    v1, 'KA-01-AA-1234', 'Madan Kumar', 'DO-SP-0018',
    'confirmed',
    sub, 0, sub, gst_amt/2, gst_amt/2, 0, gst_amt,
    total, 100000, 'neft', 'NEFT-SP-0018',
    total - 100000, NULL, false, admin_id, now(), now(), p1
  );
  INSERT INTO sale_items VALUES
    (gen_random_uuid(), sale_id, mm40_id, '40mm Aggregates', '25171010', 'MT',
     65.0, 880, 65.0*880, 5.00, 2.50, 2.50, 0,
     65.0*880*0.025, 65.0*880*0.025, 0, 65.0*880*1.05, 1),
    (gen_random_uuid(), sale_id, psand_id, 'P-Sand (Plastering Sand)', '25171010', 'MT',
     45.0, 780, 45.0*780, 5.00, 2.50, 2.50, 0,
     45.0*780*0.025, 45.0*780*0.025, 0, 45.0*780*1.05, 2);

  -- ── Invoice 6: L&T — 12mm Aggregates (30 days ago) ──
  sale_id := gen_random_uuid();
  qty := 200.0; rate := 960; sub := qty * rate;
  gst_amt := sub * 0.05; total := sub + gst_amt;
  INSERT INTO sales VALUES (
    sale_id, 'BMP/2526/0006', 'tax_invoice',
    CURRENT_DATE - 30, lt_id, 'L&T Construction Ltd', '29AAACL1234F1Z8', 'L&T House, HMT Layout, Bengaluru',
    v2, 'KA-01-AB-5678', 'Ravi Kumar', 'DO-LT-002',
    'confirmed',
    sub, 0, sub, gst_amt/2, gst_amt/2, 0, gst_amt,
    total, 100000, 'neft', 'NEFT2526070001',
    total - 100000, NULL, false, admin_id, now(), now(), p1
  );
  INSERT INTO sale_items VALUES (
    gen_random_uuid(), sale_id, mm12_id, '12mm Aggregates', '25171010', 'MT',
    qty, rate, sub, 5.00, 2.50, 2.50, 0,
    gst_amt/2, gst_amt/2, 0, total, 1
  );

  -- ── Invoice 7: NHAI — M-Sand (20 days ago) ──
  sale_id := gen_random_uuid();
  qty := 450.0; rate := 850; sub := qty * rate;
  gst_amt := sub * 0.05; total := sub + gst_amt;
  INSERT INTO sales VALUES (
    sale_id, 'BMP/2526/0007', 'tax_invoice',
    CURRENT_DATE - 20, nhai_id, 'NHAI — NH48 Project', '07AAAGG1234C1Z5', 'NHAI Office, Rajaji Nagar, Bengaluru',
    v3, 'KA-02-AC-9012', 'Venkatesh B', 'DO-NHAI-2526-008',
    'confirmed',
    sub, 0, sub, gst_amt/2, gst_amt/2, 0, gst_amt,
    total, total, 'rtgs', 'RTGS-NHAI-0052',
    0, 'Second tranche of NH48 road base material', false, admin_id, now(), now(), p1
  );
  INSERT INTO sale_items VALUES (
    gen_random_uuid(), sale_id, msand_id, 'M-Sand', '25171010', 'MT',
    qty, rate, sub, 5.00, 2.50, 2.50, 0,
    gst_amt/2, gst_amt/2, 0, total, 1
  );

  -- ── Invoice 8: Prestige — 20mm + Dust (14 days ago) ──
  sale_id := gen_random_uuid();
  sub := 60.0*920 + 25.0*400; gst_amt := sub * 0.05; total := sub + gst_amt;
  INSERT INTO sales VALUES (
    sale_id, 'BMP/2526/0008', 'tax_invoice',
    CURRENT_DATE - 14, pres_id, 'Prestige Projects Pvt Ltd', '29AABCP4567G1Z2', 'Prestige Tower, MG Road, Bengaluru',
    v1, 'KA-01-AA-1234', 'Madan Kumar', 'DO-PRE-007',
    'confirmed',
    sub, 0, sub, gst_amt/2, gst_amt/2, 0, gst_amt,
    total, 0, 'credit', NULL,
    total, NULL, false, admin_id, now(), now(), p1
  );
  INSERT INTO sale_items VALUES
    (gen_random_uuid(), sale_id, mm20_id, '20mm Chilli (Aggregates)', '25171010', 'MT',
     60.0, 920, 60.0*920, 5.00, 2.50, 2.50, 0,
     60.0*920*0.025, 60.0*920*0.025, 0, 60.0*920*1.05, 1),
    (gen_random_uuid(), sale_id, dust_id, 'Dust / Stone Dust', '25171010', 'MT',
     25.0, 400, 25.0*400, 5.00, 2.50, 2.50, 0,
     25.0*400*0.025, 25.0*400*0.025, 0, 25.0*400*1.05, 2);

  -- ── Invoice 9: Retail today ──
  sale_id := gen_random_uuid();
  qty := 12.0; rate := 850; sub := qty * rate;
  gst_amt := sub * 0.05; total := sub + gst_amt;
  INSERT INTO sales VALUES (
    sale_id, 'BMP/2526/0009', 'tax_invoice',
    CURRENT_DATE, gang_id, 'Gangadhara & Sons (Retail)', NULL, 'Near Old Bus Stand, Bengaluru',
    v4, 'KA-03-AD-3456', 'Nagesh P', NULL,
    'confirmed',
    sub, 0, sub, gst_amt/2, gst_amt/2, 0, gst_amt,
    total, total, 'upi', 'UPI-GANG-20240601',
    0, NULL, false, admin_id, now(), now(), p1
  );
  INSERT INTO sale_items VALUES (
    gen_random_uuid(), sale_id, msand_id, 'M-Sand', '25171010', 'MT',
    qty, rate, sub, 5.00, 2.50, 2.50, 0,
    gst_amt/2, gst_amt/2, 0, total, 1
  );

  -- ── Invoice 10: Cancelled sale (for testing cancelled status) ──
  sale_id := gen_random_uuid();
  qty := 30.0; rate := 920; sub := qty * rate;
  gst_amt := sub * 0.05; total := sub + gst_amt;
  INSERT INTO sales VALUES (
    sale_id, 'BMP/2526/0010', 'tax_invoice',
    CURRENT_DATE - 7, pres_id, 'Prestige Projects Pvt Ltd', '29AABCP4567G1Z2', 'Prestige Tower, MG Road, Bengaluru',
    v2, 'KA-01-AB-5678', 'Ravi Kumar', 'DO-PRE-006',
    'cancelled',
    sub, 0, sub, gst_amt/2, gst_amt/2, 0, gst_amt,
    total, 0, 'credit', NULL,
    0, 'Customer cancelled order — site access issue', false, admin_id, now(), now(), p1
  );
  INSERT INTO sale_items VALUES (
    gen_random_uuid(), sale_id, mm20_id, '20mm Chilli (Aggregates)', '25171010', 'MT',
    qty, rate, sub, 5.00, 2.50, 2.50, 0,
    gst_amt/2, gst_amt/2, 0, total, 1
  );

  UPDATE crushers SET invoice_counter = 11 WHERE id = p1;
END;
$$;

-- Plant 2 sales (BMRCL + Sobha)
DO $$
DECLARE
  p2 UUID := '22222222-0000-0000-0000-000000000002';
  admin_id UUID;
  bmrcl_id UUID := '44444444-0000-0000-0000-000000000007';
  sobha_id UUID := '44444444-0000-0000-0000-000000000008';
  v6 UUID := '33333333-0000-0000-0000-000000000006';
  v7 UUID := '33333333-0000-0000-0000-000000000007';
  msand_id UUID; mm20_id UUID; gsb_id UUID;
  sale_id UUID; sub NUMERIC; gst_amt NUMERIC; total NUMERIC;
BEGIN
  SELECT id INTO msand_id FROM products WHERE code = 'MSAND';
  SELECT id INTO mm20_id  FROM products WHERE code = '20MM';
  SELECT id INTO gsb_id   FROM products WHERE code = 'GSB';
  SELECT id INTO admin_id FROM users WHERE email = 'admin@bluemetal.local';

  -- BMRCL GSB order
  sale_id := gen_random_uuid();
  sub := 500.0 * 750; gst_amt := sub * 0.05; total := sub + gst_amt;
  INSERT INTO sales VALUES (
    sale_id, 'BMT/2526/0001', 'tax_invoice',
    CURRENT_DATE - 25, bmrcl_id, 'BMRCL (Metro Rail Corp)', '29AABCB9012L1Z4', 'Metro Bhawan, Sampige Road, Bengaluru',
    v6, 'KA-05-AF-2345', 'Krishnamurthy', 'DO-BMRCL-1001',
    'confirmed',
    sub, 0, sub, gst_amt/2, gst_amt/2, 0, gst_amt,
    total, 300000, 'rtgs', 'RTGS-BMRCL-1001',
    total - 300000, 'Purple Line Metro foundation work', false, admin_id, now(), now(), p2
  );
  INSERT INTO sale_items VALUES (
    gen_random_uuid(), sale_id, gsb_id, 'GSB (Graded Stone Base)', '25171010', 'MT',
    500.0, 750, 500.0*750, 5.00, 2.50, 2.50, 0,
    500.0*750*0.025, 500.0*750*0.025, 0, 500.0*750*1.05, 1
  );

  -- Sobha M-Sand
  sale_id := gen_random_uuid();
  sub := 95.0 * 850; gst_amt := sub * 0.05; total := sub + gst_amt;
  INSERT INTO sales VALUES (
    sale_id, 'BMT/2526/0002', 'tax_invoice',
    CURRENT_DATE - 10, sobha_id, 'Sobha Developers Ltd', '29AABCS5678M1Z7', 'Sobha Towers, Hebbal, Bengaluru',
    v7, 'KA-06-AG-6789', 'Basavaraj M', 'DO-SOBHA-0044',
    'confirmed',
    sub, 0, sub, gst_amt/2, gst_amt/2, 0, gst_amt,
    total, total, 'neft', 'NEFT-SOBHA-0044',
    0, NULL, false, admin_id, now(), now(), p2
  );
  INSERT INTO sale_items VALUES (
    gen_random_uuid(), sale_id, msand_id, 'M-Sand', '25171010', 'MT',
    95.0, 850, 95.0*850, 5.00, 2.50, 2.50, 0,
    95.0*850*0.025, 95.0*850*0.025, 0, 95.0*850*1.05, 1
  );

  UPDATE crushers SET invoice_counter = 3 WHERE id = p2;
END;
$$;

-- ── 9. PURCHASES ──────────────────────────────────────────────────────────
DO $$
DECLARE
  p1 UUID := '22222222-0000-0000-0000-000000000001';
  admin_id UUID;
  deccan_id UUID := '44444444-0000-0000-0000-000000000006';
  v3 UUID := '33333333-0000-0000-0000-000000000003';
  bollar_id UUID; mm40_id UUID;
  pur_id UUID;
BEGIN
  SELECT id INTO bollar_id FROM products WHERE code = 'BOLLAR';
  SELECT id INTO admin_id FROM users WHERE email = 'admin@bluemetal.local';
  SELECT id INTO mm40_id   FROM products WHERE code = '40MM';

  -- Purchase 1: Boulder from Deccan Mining (45 days ago)
  pur_id := gen_random_uuid();
  INSERT INTO purchases VALUES (
    pur_id, 'DEC/2526/INV-045',
    CURRENT_DATE - 45, deccan_id, 'Deccan Mining Co',
    v3, 'KA-02-AC-9012',
    200.0*380, 200.0*380, 0, 0, 0,
    200.0*380, 200.0*380, 'neft',
    0, NULL, admin_id, now(), now(), p1
  );
  INSERT INTO purchase_items VALUES (
    gen_random_uuid(), pur_id, bollar_id, 'Boulder / Bollar', 'MT',
    200.0, 380, 200.0*380, 0, 0, 0, 0, 200.0*380
  );

  -- Purchase 2: Boulder (30 days ago, partially paid)
  pur_id := gen_random_uuid();
  INSERT INTO purchases VALUES (
    pur_id, 'DEC/2526/INV-061',
    CURRENT_DATE - 30, deccan_id, 'Deccan Mining Co',
    v3, 'KA-02-AC-9012',
    350.0*380, 350.0*380, 0, 0, 0,
    350.0*380, 50000, 'neft',
    350.0*380 - 50000, NULL, admin_id, now(), now(), p1
  );
  INSERT INTO purchase_items VALUES (
    gen_random_uuid(), pur_id, bollar_id, 'Boulder / Bollar', 'MT',
    350.0, 380, 350.0*380, 0, 0, 0, 0, 350.0*380
  );

  -- Purchase 3: this week
  pur_id := gen_random_uuid();
  INSERT INTO purchases VALUES (
    pur_id, 'DEC/2526/INV-078',
    CURRENT_DATE - 3, deccan_id, 'Deccan Mining Co',
    v3, 'KA-02-AC-9012',
    180.0*380, 180.0*380, 0, 0, 0,
    180.0*380, 0, 'credit',
    180.0*380, 'Payment due net-30', admin_id, now(), now(), p1
  );
  INSERT INTO purchase_items VALUES (
    gen_random_uuid(), pur_id, bollar_id, 'Boulder / Bollar', 'MT',
    180.0, 380, 180.0*380, 0, 0, 0, 0, 180.0*380
  );
END;
$$;

-- ── 10. LEDGER RECEIPTS ───────────────────────────────────────────────────
DO $$
DECLARE
  p1 UUID := '22222222-0000-0000-0000-000000000001';
  admin_id UUID;
  lt_id   UUID := '44444444-0000-0000-0000-000000000001';
  pres_id UUID := '44444444-0000-0000-0000-000000000002';
BEGIN
  SELECT id INTO admin_id FROM users WHERE email = 'admin@bluemetal.local';
  -- Receipt from L&T (partial on inv 6)
  INSERT INTO ledger_transactions (txn_type, txn_date, party_id, amount, payment_mode, narration, created_by, crusher_id)
  VALUES
    ('receipt', CURRENT_DATE - 25, lt_id,   100000, 'neft', 'NEFT against BMP/2526/0006 — 1st installment', admin_id, p1),
    ('receipt', CURRENT_DATE - 5,  lt_id,    80000, 'neft', 'NEFT against BMP/2526/0006 — 2nd installment', admin_id, p1),
    ('receipt', CURRENT_DATE - 2,  pres_id,  50000, 'cheque', 'Cheque CHQ-PRE-2002 against BMP/2526/0005', admin_id, p1);
END;
$$;

-- ── 11. QUARRY SALES ──────────────────────────────────────────────────────
DO $$
DECLARE
  p1 UUID := '22222222-0000-0000-0000-000000000001';
  admin_id UUID;
  nhai_id  UUID := '44444444-0000-0000-0000-000000000003';
  gang_id  UUID := '44444444-0000-0000-0000-000000000005';
  v3 UUID := '33333333-0000-0000-0000-000000000003';
  v4 UUID := '33333333-0000-0000-0000-000000000004';
  bollar_id UUID;
BEGIN
  SELECT id INTO bollar_id FROM products WHERE code = 'BOLLAR';
  SELECT id INTO admin_id FROM users WHERE email = 'admin@bluemetal.local';

  -- Quarry sale 1: NHAI boulders direct from quarry face
  INSERT INTO quarry_sales (invoice_number, sale_date, party_id, party_name, vehicle_id, vehicle_number,
    product_id, product_name, quantity, unit, rate, amount, royalty_rate, royalty_amount, grand_total,
    amount_received, payment_mode, notes, created_by, crusher_id)
  VALUES
    ('QMP/2526/0001', CURRENT_DATE - 35,
     nhai_id, 'NHAI — NH48 Project', v3, 'KA-02-AC-9012',
     bollar_id, 'Boulder / Bollar', 180.0, 'MT', 650, 180.0*650,
     45, 180.0*45, 180.0*695,
     180.0*695, 'rtgs', 'Boulder supply for bridge abutment', admin_id, p1),

    ('QMP/2526/0002', CURRENT_DATE - 22,
     gang_id, 'Gangadhara & Sons (Retail)', v4, 'KA-03-AD-3456',
     bollar_id, 'Boulder / Bollar', 25.0, 'MT', 650, 25.0*650,
     45, 25.0*45, 25.0*695,
     25.0*695, 'cash', NULL, admin_id, p1),

    ('QMP/2526/0003', CURRENT_DATE - 8,
     nhai_id, 'NHAI — NH48 Project', v3, 'KA-02-AC-9012',
     bollar_id, 'Boulder / Bollar', 220.0, 'MT', 650, 220.0*650,
     45, 220.0*45, 220.0*695,
     0, 'credit', 'Pending — site engineer approval required', admin_id, p1);

  UPDATE crushers SET quarry_invoice_counter = 4 WHERE id = p1;
END;
$$;

-- ── 12. QUARRY PURCHASES ──────────────────────────────────────────────────
INSERT INTO quarry_purchases (purchase_date, supplier_name, product_name, quantity, unit, rate, royalty_rate, vehicle_number, payment_mode, notes, created_by, crusher_id)
SELECT purchase_date, supplier_name, product_name, quantity, unit, rate, royalty_rate, vehicle_number, payment_mode, notes, u.id, crusher_id
FROM (VALUES
  (CURRENT_DATE - 38, 'Ramanagara Stone Mines', 'Boulder / Raw Stone',    500.0::NUMERIC, 'MT', 350::NUMERIC, 55::NUMERIC, 'KA-02-AC-9012', 'neft',  'Monthly contract supply',        '22222222-0000-0000-0000-000000000001'::UUID),
  (CURRENT_DATE - 22, 'Ramanagara Stone Mines', 'Boulder / Raw Stone',    420.0::NUMERIC, 'MT', 350::NUMERIC, 55::NUMERIC, 'KA-01-AA-1234', 'neft',  'Second fortnight supply',        '22222222-0000-0000-0000-000000000001'::UUID),
  (CURRENT_DATE - 5,  'Savandurga Quarries',    'Boulder / Raw Stone',    300.0::NUMERIC, 'MT', 360::NUMERIC, 55::NUMERIC, 'KA-02-AC-9012', 'cash',  'New supplier trial — spot rate', '22222222-0000-0000-0000-000000000001'::UUID),
  (CURRENT_DATE - 18, 'Tumkur Granite Works',   'Granite / Hard Rock',    250.0::NUMERIC, 'MT', 380::NUMERIC, 60::NUMERIC, 'KA-05-AF-2345', 'neft',  'Tumkur plant supply',            '22222222-0000-0000-0000-000000000002'::UUID)
) AS t(purchase_date, supplier_name, product_name, quantity, unit, rate, royalty_rate, vehicle_number, payment_mode, notes, crusher_id)
CROSS JOIN (SELECT id FROM users WHERE email = 'admin@bluemetal.local') u;

-- ── 13. NOTIFICATIONS ─────────────────────────────────────────────────────
INSERT INTO notifications (user_id, title, body, type, is_read, crusher_id)
SELECT u.id, title, body, type::notification_type, is_read, '22222222-0000-0000-0000-000000000001'
FROM (VALUES
  ('admin@bluemetal.local',   'New Sale — BMP/2526/0009',      'Gangadhara & Sons: 12 MT M-Sand | ₹10,710',             'sale',        false),
  ('admin@bluemetal.local',   'Sale Cancelled — BMP/2526/0010','Prestige Projects: Order cancelled by customer.',        'sale',        true),
  ('admin@bluemetal.local',   'Payment Received — L&T',         '₹80,000 received. Outstanding: ₹1,12,800.',            'payment',     false),
  ('admin@bluemetal.local',   'Maintenance Due in 7 Days',       'Screen Mesh Replacement scheduled for next week.',     'maintenance', false),
  ('admin@bluemetal.local',   'Conveyor Belt Repair In Progress','Emergency splice repair underway — plant slowdown.',   'maintenance', false),
  ('ops@bluemetal.local',     'New Sale — BMP/2526/0009',      'Today''s retail: 12 MT M-Sand dispatched.',             'sale',        false),
  ('reports@bluemetal.local', 'Monthly Report Ready',            'June P&L and GST summary available in reports.',      'sale',        false)
) AS t(email, title, body, type, is_read)
JOIN users u ON u.email = t.email;
