-- =============================================================
-- 007_seed_test_data.sql  — Demo data for two crusher units
-- Idempotent: uses ON CONFLICT DO NOTHING throughout.
-- Creates:
--   • BlueMetal Quarry Unit 1 (Hosur, TN)
--   • BlueMetal Quarry Unit 2 (Salem, TN)
-- Each unit gets: products, parties, vehicles, sales, purchases,
-- quarry_sales, maintenance, workers, attendance, ledger, opex.
-- =============================================================

DO $$
DECLARE
  -- Crusher IDs
  c1 UUID;
  c2 UUID;

  -- User IDs (pulled from test accounts)
  u_admin      UUID;
  u_sales      UUID;
  u_accounts   UUID;

  -- Unit-1 master data IDs
  p1_msand     UUID; p1_psand UUID; p1_20mm UUID; p1_40mm UUID; p1_6mm UUID;
  pa1_1 UUID; pa1_2 UUID; pa1_3 UUID; pa1_4 UUID; pa1_5 UUID; pa1_6 UUID;
  v1_1 UUID; v1_2 UUID; v1_3 UUID; v1_4 UUID;
  w1_1 UUID; w1_2 UUID; w1_3 UUID; w1_4 UUID; w1_5 UUID;
  a1_crusher UUID; a1_truck UUID;

  -- Unit-2 master data IDs
  p2_msand     UUID; p2_psand UUID; p2_20mm UUID; p2_40mm UUID; p2_dust UUID;
  pa2_1 UUID; pa2_2 UUID; pa2_3 UUID; pa2_4 UUID; pa2_5 UUID; pa2_6 UUID;
  v2_1 UUID; v2_2 UUID; v2_3 UUID;
  w2_1 UUID; w2_2 UUID; w2_3 UUID; w2_4 UUID;
  a2_crusher UUID;

  -- Sale/Purchase temp IDs
  s UUID; i UUID;

BEGIN

  -- ── Fetch test user IDs ─────────────────────────────────────
  SELECT id INTO u_admin   FROM users WHERE email = 'admin@bluemetal.local'    LIMIT 1;
  SELECT id INTO u_sales   FROM users WHERE email = 'sales@bluemetal.local'    LIMIT 1;
  SELECT id INTO u_accounts FROM users WHERE email = 'accounts@bluemetal.local' LIMIT 1;

  -- ── Create crusher Unit 1 ───────────────────────────────────
  INSERT INTO crushers (
    name, legal_name, gstin, pan, address, city, state, state_code, pincode,
    phone, email, bank_name, bank_account, bank_ifsc, bank_branch,
    invoice_prefix, quarry_invoice_prefix, is_active
  ) VALUES (
    'BlueMetal Quarry Unit 1', 'BlueMetal Industries Pvt Ltd',
    '33AABCB1234A1Z5', 'AABCB1234A',
    '45, Krishnagiri Main Road, Hosur Industrial Area', 'Hosur', 'Tamil Nadu', '33', '635109',
    '9876543210', 'unit1@bluemetal.in',
    'State Bank of India', '32145678901', 'SBIN0005612', 'Hosur Branch',
    'HU1', 'QU1', true
  )
  ON CONFLICT DO NOTHING;
  SELECT id INTO c1 FROM crushers WHERE name = 'BlueMetal Quarry Unit 1' LIMIT 1;

  -- ── Create crusher Unit 2 ───────────────────────────────────
  INSERT INTO crushers (
    name, legal_name, gstin, pan, address, city, state, state_code, pincode,
    phone, email, bank_name, bank_account, bank_ifsc, bank_branch,
    invoice_prefix, quarry_invoice_prefix, is_active
  ) VALUES (
    'BlueMetal Quarry Unit 2', 'BlueMetal Industries Pvt Ltd',
    '33AABCB1234A2Z4', 'AABCB1234A',
    '12, Salem Bypass Road, Edappadi', 'Salem', 'Tamil Nadu', '33', '637102',
    '9876543211', 'unit2@bluemetal.in',
    'Indian Bank', '61234567890', 'IDIB000S512', 'Salem Branch',
    'SU2', 'QU2', true
  )
  ON CONFLICT DO NOTHING;
  SELECT id INTO c2 FROM crushers WHERE name = 'BlueMetal Quarry Unit 2' LIMIT 1;

  -- ── Grant test users access to both crushers ─────────────────
  IF u_admin IS NOT NULL THEN
    INSERT INTO user_crusher_access (user_id, crusher_id, role) VALUES
      (u_admin, c1, 'admin'), (u_admin, c2, 'admin')
    ON CONFLICT (user_id, crusher_id) DO NOTHING;
  END IF;
  IF u_sales IS NOT NULL THEN
    INSERT INTO user_crusher_access (user_id, crusher_id, role) VALUES
      (u_sales, c1, 'sales_operator'), (u_sales, c2, 'sales_operator')
    ON CONFLICT (user_id, crusher_id) DO NOTHING;
  END IF;
  IF u_accounts IS NOT NULL THEN
    INSERT INTO user_crusher_access (user_id, crusher_id, role) VALUES
      (u_accounts, c1, 'accounts'), (u_accounts, c2, 'accounts')
    ON CONFLICT (user_id, crusher_id) DO NOTHING;
  END IF;

  -- ==============================================================
  -- UNIT 1 — HOSUR
  -- ==============================================================

  -- Products
  INSERT INTO products (name, hsn_code, unit, sale_price, purchase_price, gst_rate, crusher_id) VALUES
    ('M-Sand',              '25171010', 'MT', 850,  420, 5, c1),
    ('P-Sand',              '25171010', 'MT', 950,  460, 5, c1),
    ('20mm Blue Metal',     '25171010', 'MT', 1100, 530, 5, c1),
    ('40mm Blue Metal',     '25171010', 'MT', 980,  500, 5, c1),
    ('6mm Chips',           '25171010', 'MT', 750,  380, 5, c1)
  ON CONFLICT DO NOTHING;
  SELECT id INTO p1_msand FROM products WHERE name = 'M-Sand'          AND crusher_id = c1 LIMIT 1;
  SELECT id INTO p1_psand FROM products WHERE name = 'P-Sand'          AND crusher_id = c1 LIMIT 1;
  SELECT id INTO p1_20mm  FROM products WHERE name = '20mm Blue Metal' AND crusher_id = c1 LIMIT 1;
  SELECT id INTO p1_40mm  FROM products WHERE name = '40mm Blue Metal' AND crusher_id = c1 LIMIT 1;
  SELECT id INTO p1_6mm   FROM products WHERE name = '6mm Chips'       AND crusher_id = c1 LIMIT 1;

  -- Parties
  INSERT INTO parties (name, party_type, gstin, phone, city, state, crusher_id) VALUES
    ('Ramaiah Constructions',   'customer', '33BBBCC1111B1Z1', '9841100001', 'Chennai',    'Tamil Nadu', c1),
    ('GKK Builders Pvt Ltd',    'customer', '33CCCDD2222C1Z2', '9841100002', 'Bangalore',  'Karnataka',  c1),
    ('Suresh Road Works',       'customer', '33DDDEE3333D1Z3', '9841100003', 'Hosur',      'Tamil Nadu', c1),
    ('National Highways Dept',  'customer', '33EEEFF4444E1Z4', '9841100004', 'Krishnagiri','Tamil Nadu', c1),
    ('Ponni Granites',          'supplier', '33FFFGG5555F1Z5', '9841100005', 'Hosur',      'Tamil Nadu', c1),
    ('Karthik Transport Co',    'supplier', '33GGGGH6666G1Z6', '9841100006', 'Hosur',      'Tamil Nadu', c1)
  ON CONFLICT DO NOTHING;
  SELECT id INTO pa1_1 FROM parties WHERE name = 'Ramaiah Constructions'  AND crusher_id = c1 LIMIT 1;
  SELECT id INTO pa1_2 FROM parties WHERE name = 'GKK Builders Pvt Ltd'  AND crusher_id = c1 LIMIT 1;
  SELECT id INTO pa1_3 FROM parties WHERE name = 'Suresh Road Works'      AND crusher_id = c1 LIMIT 1;
  SELECT id INTO pa1_4 FROM parties WHERE name = 'National Highways Dept' AND crusher_id = c1 LIMIT 1;
  SELECT id INTO pa1_5 FROM parties WHERE name = 'Ponni Granites'         AND crusher_id = c1 LIMIT 1;
  SELECT id INTO pa1_6 FROM parties WHERE name = 'Karthik Transport Co'   AND crusher_id = c1 LIMIT 1;

  -- Vehicles
  INSERT INTO vehicles (reg_number, owner_name, vehicle_type, capacity_tons, is_active, crusher_id) VALUES
    ('TN33 AC 1234', 'Murugan',   'tipper', 10, true, c1),
    ('TN33 AC 5678', 'Selvam',    'tipper', 12, true, c1),
    ('KA01 BX 9012', 'Ravi Kumar','tipper', 14, true, c1),
    ('TN33 AD 3456', 'Pandian',   'tractor', 6, true, c1)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v1_1 FROM vehicles WHERE reg_number = 'TN33 AC 1234' AND crusher_id = c1 LIMIT 1;
  SELECT id INTO v1_2 FROM vehicles WHERE reg_number = 'TN33 AC 5678' AND crusher_id = c1 LIMIT 1;
  SELECT id INTO v1_3 FROM vehicles WHERE reg_number = 'KA01 BX 9012' AND crusher_id = c1 LIMIT 1;
  SELECT id INTO v1_4 FROM vehicles WHERE reg_number = 'TN33 AD 3456' AND crusher_id = c1 LIMIT 1;

  -- Workers
  INSERT INTO workers (name, phone, designation, wage_type, wage_rate, joining_date, crusher_id) VALUES
    ('Arumugam K',   '9876501001', 'Machine Operator',    'daily',   650, '2023-03-01', c1),
    ('Balamurugan R','9876501002', 'Crusher Supervisor',  'monthly', 18000, '2022-11-15', c1),
    ('Chinnaswamy P','9876501003', 'Helper',              'daily',   450, '2024-01-10', c1),
    ('Dhivya S',     '9876501004', 'Weighbridge Operator','monthly', 14000, '2023-07-01', c1),
    ('Eswaran M',    '9876501005', 'Driver',              'daily',   600, '2023-05-20', c1)
  ON CONFLICT DO NOTHING;
  SELECT id INTO w1_1 FROM workers WHERE name = 'Arumugam K'    AND crusher_id = c1 LIMIT 1;
  SELECT id INTO w1_2 FROM workers WHERE name = 'Balamurugan R' AND crusher_id = c1 LIMIT 1;
  SELECT id INTO w1_3 FROM workers WHERE name = 'Chinnaswamy P' AND crusher_id = c1 LIMIT 1;
  SELECT id INTO w1_4 FROM workers WHERE name = 'Dhivya S'      AND crusher_id = c1 LIMIT 1;
  SELECT id INTO w1_5 FROM workers WHERE name = 'Eswaran M'     AND crusher_id = c1 LIMIT 1;

  -- Assets
  INSERT INTO assets (name, asset_type, serial_number, purchase_date, purchase_value, crusher_id) VALUES
    ('Jaw Crusher 30x24',  'machinery', 'JC-30-24-2022', '2022-01-15', 3500000, c1),
    ('Tipper Truck MH014', 'vehicle',   'TK-MH014-2021', '2021-06-10', 1200000, c1)
  ON CONFLICT DO NOTHING;
  SELECT id INTO a1_crusher FROM assets WHERE name = 'Jaw Crusher 30x24'  AND crusher_id = c1 LIMIT 1;
  SELECT id INTO a1_truck   FROM assets WHERE name = 'Tipper Truck MH014' AND crusher_id = c1 LIMIT 1;

  -- ── Sales — Unit 1 (3 months: Apr, May, Jun 2026) ─────────────
  -- April batch
  IF pa1_1 IS NOT NULL AND p1_msand IS NOT NULL THEN
    INSERT INTO sales (invoice_number, party_id, sale_date, subtotal, cgst_amount, sgst_amount, total_amount,
                       payment_mode, payment_status, vehicle_id, crusher_id, created_by)
    VALUES
      ('HU1/2526/0001', pa1_1, '2026-04-03', 42500, 1062.50, 1062.50, 44625, 'cash',   'paid',    v1_1, c1, u_sales),
      ('HU1/2526/0002', pa1_2, '2026-04-07', 66000, 1650.00, 1650.00, 69300, 'upi',    'paid',    v1_2, c1, u_sales),
      ('HU1/2526/0003', pa1_3, '2026-04-11', 38250, 956.25,  956.25,  40162.5,'cash',  'paid',    v1_1, c1, u_sales),
      ('HU1/2526/0004', pa1_4, '2026-04-16', 88000, 2200.00, 2200.00, 92400, 'cheque', 'paid',    v1_3, c1, u_sales),
      ('HU1/2526/0005', pa1_1, '2026-04-22', 55250, 1381.25, 1381.25, 58012.5,'upi',   'paid',    v1_2, c1, u_sales),
      ('HU1/2526/0006', pa1_2, '2026-04-28', 49500, 1237.50, 1237.50, 51975, 'cash',   'pending', v1_4, c1, u_sales),
    -- May
      ('HU1/2526/0007', pa1_3, '2026-05-04', 67200, 1680.00, 1680.00, 70560, 'upi',    'paid',    v1_1, c1, u_sales),
      ('HU1/2526/0008', pa1_4, '2026-05-09', 110000,2750.00, 2750.00, 115500,'cheque', 'paid',    v1_3, c1, u_sales),
      ('HU1/2526/0009', pa1_1, '2026-05-14', 42500, 1062.50, 1062.50, 44625, 'cash',   'paid',    v1_2, c1, u_sales),
      ('HU1/2526/0010', pa1_2, '2026-05-20', 76000, 1900.00, 1900.00, 79800, 'upi',    'paid',    v1_1, c1, u_sales),
      ('HU1/2526/0011', pa1_3, '2026-05-25', 58500, 1462.50, 1462.50, 61425, 'cash',   'paid',    v1_4, c1, u_sales),
      ('HU1/2526/0012', pa1_4, '2026-05-30', 93500, 2337.50, 2337.50, 98175, 'cheque', 'pending', v1_2, c1, u_sales),
    -- June
      ('HU1/2526/0013', pa1_1, '2026-06-03', 51000, 1275.00, 1275.00, 53550, 'upi',    'paid',    v1_1, c1, u_sales),
      ('HU1/2526/0014', pa1_2, '2026-06-06', 63800, 1595.00, 1595.00, 66990, 'cash',   'paid',    v1_3, c1, u_sales),
      ('HU1/2526/0015', pa1_3, '2026-06-09', 47600, 1190.00, 1190.00, 49980, 'upi',    'paid',    v1_2, c1, u_sales)
    ON CONFLICT (invoice_number) DO NOTHING;

    -- Sale items (link to first few sales for detail)
    FOR s IN SELECT id FROM sales WHERE crusher_id = c1 AND invoice_number = 'HU1/2526/0001' LIMIT 1 LOOP
      INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, amount)
      VALUES (s, p1_msand, 50, 850, 42500) ON CONFLICT DO NOTHING;
    END LOOP;
    FOR s IN SELECT id FROM sales WHERE crusher_id = c1 AND invoice_number = 'HU1/2526/0002' LIMIT 1 LOOP
      INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, amount)
      VALUES (s, p1_20mm, 60, 1100, 66000) ON CONFLICT DO NOTHING;
    END LOOP;
    FOR s IN SELECT id FROM sales WHERE crusher_id = c1 AND invoice_number = 'HU1/2526/0003' LIMIT 1 LOOP
      INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, amount)
      VALUES (s, p1_psand, 40, 950, 38000), (s, p1_6mm, 0.33, 750, 247.5) ON CONFLICT DO NOTHING;
    END LOOP;
    FOR s IN SELECT id FROM sales WHERE crusher_id = c1 AND invoice_number = 'HU1/2526/0004' LIMIT 1 LOOP
      INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, amount)
      VALUES (s, p1_40mm, 80, 980, 78400), (s, p1_20mm, 8.8, 1100, 9680) ON CONFLICT DO NOTHING;
    END LOOP;
    FOR s IN SELECT id FROM sales WHERE crusher_id = c1 AND invoice_number = 'HU1/2526/0008' LIMIT 1 LOOP
      INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, amount)
      VALUES (s, p1_msand, 60, 850, 51000), (s, p1_psand, 62.1, 950, 59000) ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  -- Purchases — Unit 1
  IF pa1_5 IS NOT NULL AND p1_msand IS NOT NULL THEN
    INSERT INTO purchases (invoice_number, party_id, purchase_date, subtotal, cgst_amount, sgst_amount,
                           total_amount, payment_mode, payment_status, crusher_id, created_by)
    VALUES
      ('PUR/HU1/0001', pa1_5, '2026-04-05',  126000, 3150, 3150, 132300, 'cheque', 'paid',    c1, u_accounts),
      ('PUR/HU1/0002', pa1_5, '2026-04-20',  105000, 2625, 2625, 110250, 'upi',    'paid',    c1, u_accounts),
      ('PUR/HU1/0003', pa1_6, '2026-04-28',  42000,  1050, 1050, 44100,  'cash',   'paid',    c1, u_accounts),
      ('PUR/HU1/0004', pa1_5, '2026-05-10',  189000, 4725, 4725, 198450, 'cheque', 'paid',    c1, u_accounts),
      ('PUR/HU1/0005', pa1_6, '2026-05-22',  56000,  1400, 1400, 58800,  'cash',   'paid',    c1, u_accounts),
      ('PUR/HU1/0006', pa1_5, '2026-06-05',  147000, 3675, 3675, 154350, 'cheque', 'pending', c1, u_accounts)
    ON CONFLICT (invoice_number) DO NOTHING;

    FOR s IN SELECT id FROM purchases WHERE crusher_id = c1 AND invoice_number = 'PUR/HU1/0001' LOOP
      INSERT INTO purchase_items (purchase_id, product_id, quantity, unit_price, amount)
      VALUES (s, p1_msand, 300, 420, 126000) ON CONFLICT DO NOTHING;
    END LOOP;
    FOR s IN SELECT id FROM purchases WHERE crusher_id = c1 AND invoice_number = 'PUR/HU1/0004' LOOP
      INSERT INTO purchase_items (purchase_id, product_id, quantity, unit_price, amount)
      VALUES (s, p1_20mm, 300, 530, 159000), (s, p1_psand, 65.2, 460, 30000) ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  -- Quarry sales — Unit 1
  IF pa1_3 IS NOT NULL THEN
    INSERT INTO quarry_sales (invoice_number, party_id, vehicle_id, material_type, quantity_tons,
                              rate_per_ton, royalty_per_ton, amount, royalty_amount, sale_date, crusher_id, created_by)
    VALUES
      ('QU1/2526/0001', pa1_3, v1_1, 'Blue Metal Rock', 120, 180, 55, 21600, 6600, '2026-04-02', c1, u_sales),
      ('QU1/2526/0002', pa1_4, v1_2, 'Blue Metal Rock', 200, 180, 55, 36000, 11000,'2026-04-10', c1, u_sales),
      ('QU1/2526/0003', pa1_3, v1_3, 'Blue Metal Rock', 150, 185, 55, 27750, 8250, '2026-04-19', c1, u_sales),
      ('QU1/2526/0004', pa1_4, v1_1, 'Earth & Soil',     80, 120, 30, 9600,  2400, '2026-05-03', c1, u_sales),
      ('QU1/2526/0005', pa1_3, v1_2, 'Blue Metal Rock', 180, 185, 55, 33300, 9900, '2026-05-15', c1, u_sales),
      ('QU1/2526/0006', pa1_4, v1_4, 'Blue Metal Rock', 220, 185, 55, 40700, 12100,'2026-05-28', c1, u_sales),
      ('QU1/2526/0007', pa1_3, v1_1, 'Blue Metal Rock', 160, 190, 55, 30400, 8800, '2026-06-07', c1, u_sales)
    ON CONFLICT (invoice_number) DO NOTHING;
  END IF;

  -- Maintenance records — Unit 1
  IF a1_crusher IS NOT NULL THEN
    INSERT INTO maintenance_records (asset_id, maintenance_type, description, maintenance_date,
                                     cost, vendor_name, next_due_date, status, crusher_id)
    VALUES
      (a1_crusher, 'scheduled',   'Monthly jaw plate inspection and lubrication',      '2026-04-05', 8500,  'Crusher Care Services', '2026-05-05', 'completed', c1),
      (a1_crusher, 'breakdown',   'Toggle plate replacement after excessive vibration', '2026-04-18', 24000, 'Metso Parts India',     '2026-07-18', 'completed', c1),
      (a1_truck,   'scheduled',   'Quarterly tyre rotation and brake check',            '2026-05-02', 5200,  'Hosur Tyres & Auto',    '2026-08-02', 'completed', c1),
      (a1_crusher, 'scheduled',   'Monthly jaw plate inspection and lubrication',      '2026-05-05', 8500,  'Crusher Care Services', '2026-06-05', 'completed', c1),
      (a1_crusher, 'preventive',  'Belt tension check and conveyor alignment',          '2026-06-01', 3800,  'Crusher Care Services', '2026-09-01', 'pending',   c1)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Attendance — Unit 1 (last 30 working days)
  IF w1_1 IS NOT NULL THEN
    INSERT INTO attendance (worker_id, date, status, crusher_id) VALUES
      (w1_1, '2026-05-05', 'present', c1),(w1_1,'2026-05-06','present',c1),(w1_1,'2026-05-07','present',c1),
      (w1_1, '2026-05-08', 'absent', c1),(w1_1,'2026-05-09','present',c1),(w1_1,'2026-05-12','present',c1),
      (w1_1, '2026-05-13','present',c1),(w1_1,'2026-05-14','half_day',c1),(w1_1,'2026-05-15','present',c1),
      (w1_2, '2026-05-05','present',c1),(w1_2,'2026-05-06','present',c1),(w1_2,'2026-05-07','present',c1),
      (w1_2, '2026-05-08','present',c1),(w1_2,'2026-05-09','present',c1),(w1_2,'2026-05-12','present',c1),
      (w1_3, '2026-05-05','present',c1),(w1_3,'2026-05-06','absent',c1),(w1_3,'2026-05-07','present',c1),
      (w1_3, '2026-05-08','present',c1),(w1_3,'2026-05-09','absent',c1),(w1_3,'2026-05-12','present',c1),
      (w1_4, '2026-05-05','present',c1),(w1_4,'2026-05-06','present',c1),(w1_4,'2026-05-07','present',c1),
      (w1_4, '2026-05-08','present',c1),(w1_4,'2026-05-09','present',c1),(w1_4,'2026-05-12','leave',c1),
      (w1_5, '2026-05-05','present',c1),(w1_5,'2026-05-06','present',c1),(w1_5,'2026-05-07','absent',c1),
      (w1_5, '2026-05-08','present',c1),(w1_5,'2026-05-09','present',c1),(w1_5,'2026-05-12','present',c1)
    ON CONFLICT (worker_id, date) DO NOTHING;
  END IF;

  -- Wage payments — Unit 1
  IF w1_1 IS NOT NULL THEN
    INSERT INTO wage_payments (worker_id, period_from, period_to, days_worked, gross_wages,
                               deductions, net_wages, payment_date, payment_mode, crusher_id)
    VALUES
      (w1_1, '2026-04-01','2026-04-30', 26, 16900,  0,    16900,  '2026-05-01','cash',   c1),
      (w1_2, '2026-04-01','2026-04-30', 26, 18000,  500,  17500,  '2026-05-01','bank',   c1),
      (w1_3, '2026-04-01','2026-04-30', 24, 10800,  0,    10800,  '2026-05-01','cash',   c1),
      (w1_4, '2026-04-01','2026-04-30', 26, 14000,  0,    14000,  '2026-05-01','bank',   c1),
      (w1_5, '2026-04-01','2026-04-30', 25, 15000,  1000, 14000,  '2026-05-01','cash',   c1),
      (w1_1, '2026-05-01','2026-05-31', 27, 17550,  0,    17550,  '2026-06-01','cash',   c1),
      (w1_2, '2026-05-01','2026-05-31', 27, 18000,  0,    18000,  '2026-06-01','bank',   c1),
      (w1_3, '2026-05-01','2026-05-31', 25, 11250,  0,    11250,  '2026-06-01','cash',   c1),
      (w1_4, '2026-05-01','2026-05-31', 27, 14000,  0,    14000,  '2026-06-01','bank',   c1),
      (w1_5, '2026-05-01','2026-05-31', 26, 15600,  0,    15600,  '2026-06-01','cash',   c1)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Ledger — Unit 1 (receipts + opex payments)
  IF pa1_1 IS NOT NULL THEN
    INSERT INTO ledger_transactions (type, party_id, amount, description, transaction_date,
                                     reference_number, payment_mode, balance_after, crusher_id)
    VALUES
      -- Receipts from customers
      ('receipt', pa1_1, 44625,  'Against HU1/2526/0001 — M-Sand supply',         '2026-04-05', 'RCPT/001', 'cash',   44625,  c1),
      ('receipt', pa1_2, 69300,  'Against HU1/2526/0002 — 20mm Blue Metal',       '2026-04-09', 'RCPT/002', 'upi',    113925, c1),
      ('receipt', pa1_3, 40162,  'Against HU1/2526/0003 — P-Sand + 6mm',          '2026-04-14', 'RCPT/003', 'cash',   154087, c1),
      ('receipt', pa1_4, 92400,  'Against HU1/2526/0004 — 40mm + 20mm supply',    '2026-04-18', 'RCPT/004', 'cheque', 246487, c1),
      ('receipt', pa1_1, 58012,  'Against HU1/2526/0005 — M-Sand supply',         '2026-04-24', 'RCPT/005', 'upi',    304499, c1),
      ('receipt', pa1_3, 70560,  'Against HU1/2526/0007 — P-Sand supply',         '2026-05-07', 'RCPT/006', 'upi',    375059, c1),
      ('receipt', pa1_4, 115500, 'Against HU1/2526/0008 — Bulk supply',           '2026-05-12', 'RCPT/007', 'cheque', 490559, c1),
      ('receipt', pa1_1, 44625,  'Against HU1/2526/0009',                         '2026-05-17', 'RCPT/008', 'cash',   535184, c1),
      ('receipt', pa1_2, 79800,  'Against HU1/2526/0010',                         '2026-05-23', 'RCPT/009', 'upi',    614984, c1),
      ('receipt', pa1_1, 53550,  'Against HU1/2526/0013',                         '2026-06-05', 'RCPT/010', 'upi',    668534, c1),
      -- Opex payments
      ('payment', pa1_5, 132300, 'Raw material — Ponni Granites PUR/HU1/0001',    '2026-04-06', 'PAY/001',  'cheque', 536234, c1),
      ('payment', pa1_6, 44100,  'Transport charges — Karthik Transport PUR/HU1/0003','2026-04-30','PAY/002','cash',  492134, c1),
      ('payment', pa1_5, 198450, 'Raw material — PUR/HU1/0004',                   '2026-05-12', 'PAY/003',  'cheque', 293684, c1),
      ('payment', pa1_6, 58800,  'Transport charges — PUR/HU1/0005',              '2026-05-25', 'PAY/004',  'cash',   234884, c1),
      -- Opex (electricity, diesel, misc)
      (NULL,      NULL,  58400,  'TNEB Electricity bill — April 2026',             '2026-04-30', 'OPEX/001', 'cheque', 176484, c1),
      (NULL,      NULL,  43200,  'Diesel — 400 litres @ ₹108',                    '2026-04-25', 'OPEX/002', 'cash',   133284, c1),
      (NULL,      NULL,  62300,  'TNEB Electricity bill — May 2026',               '2026-05-31', 'OPEX/003', 'cheque',  70984, c1),
      (NULL,      NULL,  48600,  'Diesel — 450 litres @ ₹108',                    '2026-05-27', 'OPEX/004', 'cash',    22384, c1),
      (NULL,      NULL,  12000,  'Site security charges — April + May',            '2026-05-05', 'OPEX/005', 'cash',    10384, c1),
      (NULL,      NULL,  8500,   'Crusher maintenance — April',                    '2026-04-07', 'OPEX/006', 'cash',     1884, c1)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ==============================================================
  -- UNIT 2 — SALEM
  -- ==============================================================

  -- Products
  INSERT INTO products (name, hsn_code, unit, sale_price, purchase_price, gst_rate, crusher_id) VALUES
    ('M-Sand',          '25171010', 'MT', 870,  430, 5, c2),
    ('P-Sand',          '25171010', 'MT', 970,  470, 5, c2),
    ('20mm Blue Metal', '25171010', 'MT', 1120, 540, 5, c2),
    ('40mm Blue Metal', '25171010', 'MT', 1000, 510, 5, c2),
    ('Quarry Dust',     '25171010', 'MT', 600,  280, 5, c2)
  ON CONFLICT DO NOTHING;
  SELECT id INTO p2_msand FROM products WHERE name = 'M-Sand'          AND crusher_id = c2 LIMIT 1;
  SELECT id INTO p2_psand FROM products WHERE name = 'P-Sand'          AND crusher_id = c2 LIMIT 1;
  SELECT id INTO p2_20mm  FROM products WHERE name = '20mm Blue Metal' AND crusher_id = c2 LIMIT 1;
  SELECT id INTO p2_40mm  FROM products WHERE name = '40mm Blue Metal' AND crusher_id = c2 LIMIT 1;
  SELECT id INTO p2_dust  FROM products WHERE name = 'Quarry Dust'     AND crusher_id = c2 LIMIT 1;

  -- Parties
  INSERT INTO parties (name, party_type, gstin, phone, city, state, crusher_id) VALUES
    ('Salem Steel Constructions', 'customer', '33HHHII7777H1Z7', '9944200001', 'Salem',     'Tamil Nadu', c2),
    ('Erode Roads Pvt Ltd',       'customer', '33IIIJJ8888I1Z8', '9944200002', 'Erode',     'Tamil Nadu', c2),
    ('TNHB Salem Division',       'customer', '33JJJKK9999J1Z9', '9944200003', 'Salem',     'Tamil Nadu', c2),
    ('Coimbatore Infra Corp',     'customer', '33KKKLL0000K1Z0', '9944200004', 'Coimbatore','Tamil Nadu', c2),
    ('Selvam Rock Quarry',        'supplier', '33LLLMM1111L1Z1', '9944200005', 'Salem',     'Tamil Nadu', c2),
    ('Sri Murugan Transport',     'supplier', '33MMMNN2222M1Z2', '9944200006', 'Namakkal',  'Tamil Nadu', c2)
  ON CONFLICT DO NOTHING;
  SELECT id INTO pa2_1 FROM parties WHERE name = 'Salem Steel Constructions' AND crusher_id = c2 LIMIT 1;
  SELECT id INTO pa2_2 FROM parties WHERE name = 'Erode Roads Pvt Ltd'       AND crusher_id = c2 LIMIT 1;
  SELECT id INTO pa2_3 FROM parties WHERE name = 'TNHB Salem Division'       AND crusher_id = c2 LIMIT 1;
  SELECT id INTO pa2_4 FROM parties WHERE name = 'Coimbatore Infra Corp'     AND crusher_id = c2 LIMIT 1;
  SELECT id INTO pa2_5 FROM parties WHERE name = 'Selvam Rock Quarry'        AND crusher_id = c2 LIMIT 1;
  SELECT id INTO pa2_6 FROM parties WHERE name = 'Sri Murugan Transport'     AND crusher_id = c2 LIMIT 1;

  -- Vehicles
  INSERT INTO vehicles (reg_number, owner_name, vehicle_type, capacity_tons, is_active, crusher_id) VALUES
    ('TN30 AK 4455', 'Sivakumar',   'tipper', 10, true, c2),
    ('TN30 AK 6677', 'Manikandan',  'tipper', 12, true, c2),
    ('TN30 BL 8899', 'Anbazhagan',  'tipper', 14, true, c2)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v2_1 FROM vehicles WHERE reg_number = 'TN30 AK 4455' AND crusher_id = c2 LIMIT 1;
  SELECT id INTO v2_2 FROM vehicles WHERE reg_number = 'TN30 AK 6677' AND crusher_id = c2 LIMIT 1;
  SELECT id INTO v2_3 FROM vehicles WHERE reg_number = 'TN30 BL 8899' AND crusher_id = c2 LIMIT 1;

  -- Workers
  INSERT INTO workers (name, phone, designation, wage_type, wage_rate, joining_date, crusher_id) VALUES
    ('Govindasamy T', '9944501001', 'Machine Operator',   'daily',   670, '2023-01-15', c2),
    ('Hariharan S',   '9944501002', 'Crusher Supervisor', 'monthly', 19000,'2022-08-01', c2),
    ('Ilayaraja P',   '9944501003', 'Helper',             'daily',   460, '2024-03-01', c2),
    ('Jeyaraman K',   '9944501004', 'Driver',             'daily',   610, '2023-09-10', c2)
  ON CONFLICT DO NOTHING;
  SELECT id INTO w2_1 FROM workers WHERE name = 'Govindasamy T' AND crusher_id = c2 LIMIT 1;
  SELECT id INTO w2_2 FROM workers WHERE name = 'Hariharan S'   AND crusher_id = c2 LIMIT 1;
  SELECT id INTO w2_3 FROM workers WHERE name = 'Ilayaraja P'   AND crusher_id = c2 LIMIT 1;
  SELECT id INTO w2_4 FROM workers WHERE name = 'Jeyaraman K'   AND crusher_id = c2 LIMIT 1;

  -- Assets
  INSERT INTO assets (name, asset_type, serial_number, purchase_date, purchase_value, crusher_id) VALUES
    ('VSI Crusher Salem', 'machinery', 'VSI-SLM-2023', '2023-03-20', 4200000, c2)
  ON CONFLICT DO NOTHING;
  SELECT id INTO a2_crusher FROM assets WHERE name = 'VSI Crusher Salem' AND crusher_id = c2 LIMIT 1;

  -- Sales — Unit 2
  IF pa2_1 IS NOT NULL AND p2_msand IS NOT NULL THEN
    INSERT INTO sales (invoice_number, party_id, sale_date, subtotal, cgst_amount, sgst_amount, total_amount,
                       payment_mode, payment_status, vehicle_id, crusher_id, created_by)
    VALUES
      ('SU2/2526/0001', pa2_1, '2026-04-04',  52200, 1305,   1305,   54810,  'upi',    'paid',    v2_1, c2, u_sales),
      ('SU2/2526/0002', pa2_2, '2026-04-09',  67200, 1680,   1680,   70560,  'cheque', 'paid',    v2_2, c2, u_sales),
      ('SU2/2526/0003', pa2_3, '2026-04-15',  89600, 2240,   2240,   94080,  'cheque', 'paid',    v2_3, c2, u_sales),
      ('SU2/2526/0004', pa2_4, '2026-04-22',  43500, 1087.5, 1087.5, 45675,  'upi',    'paid',    v2_1, c2, u_sales),
      ('SU2/2526/0005', pa2_1, '2026-05-06',  78400, 1960,   1960,   82320,  'cheque', 'paid',    v2_2, c2, u_sales),
      ('SU2/2526/0006', pa2_2, '2026-05-13',  56700, 1417.5, 1417.5, 59535,  'upi',    'paid',    v2_3, c2, u_sales),
      ('SU2/2526/0007', pa2_3, '2026-05-19', 102400, 2560,   2560,  107520,  'cheque', 'paid',    v2_1, c2, u_sales),
      ('SU2/2526/0008', pa2_4, '2026-05-26',  47100, 1177.5, 1177.5, 49455,  'upi',    'pending', v2_2, c2, u_sales),
      ('SU2/2526/0009', pa2_1, '2026-06-04',  63840, 1596,   1596,   67032,  'upi',    'paid',    v2_3, c2, u_sales),
      ('SU2/2526/0010', pa2_2, '2026-06-08',  84000, 2100,   2100,   88200,  'cheque', 'paid',    v2_1, c2, u_sales)
    ON CONFLICT (invoice_number) DO NOTHING;

    FOR s IN SELECT id FROM sales WHERE crusher_id = c2 AND invoice_number = 'SU2/2526/0001' LOOP
      INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, amount)
      VALUES (s, p2_msand, 60, 870, 52200) ON CONFLICT DO NOTHING;
    END LOOP;
    FOR s IN SELECT id FROM sales WHERE crusher_id = c2 AND invoice_number = 'SU2/2526/0002' LOOP
      INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, amount)
      VALUES (s, p2_20mm, 60, 1120, 67200) ON CONFLICT DO NOTHING;
    END LOOP;
    FOR s IN SELECT id FROM sales WHERE crusher_id = c2 AND invoice_number = 'SU2/2526/0003' LOOP
      INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, amount)
      VALUES (s, p2_40mm, 80, 1000, 80000), (s, p2_psand, 9.9, 970, 9600) ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  -- Purchases — Unit 2
  IF pa2_5 IS NOT NULL AND p2_20mm IS NOT NULL THEN
    INSERT INTO purchases (invoice_number, party_id, purchase_date, subtotal, cgst_amount, sgst_amount,
                           total_amount, payment_mode, payment_status, crusher_id, created_by)
    VALUES
      ('PUR/SU2/0001', pa2_5, '2026-04-06',  151200, 3780, 3780, 158760, 'cheque', 'paid',    c2, u_accounts),
      ('PUR/SU2/0002', pa2_6, '2026-04-19',   52500, 1312, 1312,  55124, 'cash',   'paid',    c2, u_accounts),
      ('PUR/SU2/0003', pa2_5, '2026-05-08',  178500, 4462, 4462, 187424, 'cheque', 'paid',    c2, u_accounts),
      ('PUR/SU2/0004', pa2_6, '2026-05-23',   63000, 1575, 1575,  66150, 'cash',   'paid',    c2, u_accounts),
      ('PUR/SU2/0005', pa2_5, '2026-06-06',  139650, 3491, 3491, 146632, 'cheque', 'pending', c2, u_accounts)
    ON CONFLICT (invoice_number) DO NOTHING;
  END IF;

  -- Quarry sales — Unit 2
  IF pa2_2 IS NOT NULL THEN
    INSERT INTO quarry_sales (invoice_number, party_id, vehicle_id, material_type, quantity_tons,
                              rate_per_ton, royalty_per_ton, amount, royalty_amount, sale_date, crusher_id, created_by)
    VALUES
      ('QU2/2526/0001', pa2_2, v2_1, 'Blue Metal Rock', 140, 185, 55, 25900, 7700,  '2026-04-03', c2, u_sales),
      ('QU2/2526/0002', pa2_3, v2_2, 'Blue Metal Rock', 220, 185, 55, 40700, 12100, '2026-04-14', c2, u_sales),
      ('QU2/2526/0003', pa2_2, v2_3, 'Blue Metal Rock', 175, 190, 55, 33250, 9625,  '2026-05-02', c2, u_sales),
      ('QU2/2526/0004', pa2_3, v2_1, 'Earth & Soil',    100, 120, 30, 12000, 3000,  '2026-05-18', c2, u_sales),
      ('QU2/2526/0005', pa2_2, v2_2, 'Blue Metal Rock', 200, 190, 55, 38000, 11000, '2026-06-02', c2, u_sales)
    ON CONFLICT (invoice_number) DO NOTHING;
  END IF;

  -- Maintenance — Unit 2
  IF a2_crusher IS NOT NULL THEN
    INSERT INTO maintenance_records (asset_id, maintenance_type, description, maintenance_date,
                                     cost, vendor_name, next_due_date, status, crusher_id)
    VALUES
      (a2_crusher, 'scheduled', 'Monthly rotor and bearing inspection',            '2026-04-08', 9200, 'VSI Spares Chennai', '2026-05-08', 'completed', c2),
      (a2_crusher, 'scheduled', 'Monthly rotor and bearing inspection',            '2026-05-08', 9200, 'VSI Spares Chennai', '2026-06-08', 'completed', c2),
      (a2_crusher, 'preventive','Wear parts replacement — anvils and feed tube',   '2026-05-20', 32000,'VSI Spares Chennai', '2026-11-20', 'completed', c2)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Attendance — Unit 2
  IF w2_1 IS NOT NULL THEN
    INSERT INTO attendance (worker_id, date, status, crusher_id) VALUES
      (w2_1,'2026-05-05','present',c2),(w2_1,'2026-05-06','present',c2),(w2_1,'2026-05-07','present',c2),
      (w2_1,'2026-05-08','present',c2),(w2_1,'2026-05-09','absent',c2),(w2_1,'2026-05-12','present',c2),
      (w2_2,'2026-05-05','present',c2),(w2_2,'2026-05-06','present',c2),(w2_2,'2026-05-07','present',c2),
      (w2_2,'2026-05-08','present',c2),(w2_2,'2026-05-09','present',c2),(w2_2,'2026-05-12','present',c2),
      (w2_3,'2026-05-05','absent',c2),(w2_3,'2026-05-06','present',c2),(w2_3,'2026-05-07','present',c2),
      (w2_3,'2026-05-08','half_day',c2),(w2_3,'2026-05-09','present',c2),(w2_3,'2026-05-12','present',c2),
      (w2_4,'2026-05-05','present',c2),(w2_4,'2026-05-06','present',c2),(w2_4,'2026-05-07','present',c2),
      (w2_4,'2026-05-08','present',c2),(w2_4,'2026-05-09','leave',c2),(w2_4,'2026-05-12','present',c2)
    ON CONFLICT (worker_id, date) DO NOTHING;
  END IF;

  -- Wage payments — Unit 2
  IF w2_1 IS NOT NULL THEN
    INSERT INTO wage_payments (worker_id, period_from, period_to, days_worked, gross_wages,
                               deductions, net_wages, payment_date, payment_mode, crusher_id)
    VALUES
      (w2_1,'2026-04-01','2026-04-30',26,17420,0,17420,'2026-05-01','cash',c2),
      (w2_2,'2026-04-01','2026-04-30',26,19000,500,18500,'2026-05-01','bank',c2),
      (w2_3,'2026-04-01','2026-04-30',24,11040,0,11040,'2026-05-01','cash',c2),
      (w2_4,'2026-04-01','2026-04-30',25,15250,0,15250,'2026-05-01','cash',c2),
      (w2_1,'2026-05-01','2026-05-31',27,18090,0,18090,'2026-06-01','cash',c2),
      (w2_2,'2026-05-01','2026-05-31',27,19000,0,19000,'2026-06-01','bank',c2),
      (w2_3,'2026-05-01','2026-05-31',25,11500,0,11500,'2026-06-01','cash',c2),
      (w2_4,'2026-05-01','2026-05-31',26,15860,0,15860,'2026-06-01','cash',c2)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Ledger — Unit 2
  IF pa2_1 IS NOT NULL THEN
    INSERT INTO ledger_transactions (type, party_id, amount, description, transaction_date,
                                     reference_number, payment_mode, balance_after, crusher_id)
    VALUES
      ('receipt', pa2_1, 54810,  'Against SU2/2526/0001',                            '2026-04-07', 'RCPT/S001','upi',   54810, c2),
      ('receipt', pa2_2, 70560,  'Against SU2/2526/0002',                            '2026-04-12', 'RCPT/S002','cheque',125370,c2),
      ('receipt', pa2_3, 94080,  'Against SU2/2526/0003',                            '2026-04-18', 'RCPT/S003','cheque',219450,c2),
      ('receipt', pa2_4, 45675,  'Against SU2/2526/0004',                            '2026-04-25', 'RCPT/S004','upi',   265125,c2),
      ('receipt', pa2_1, 82320,  'Against SU2/2526/0005',                            '2026-05-09', 'RCPT/S005','cheque',347445,c2),
      ('receipt', pa2_2, 59535,  'Against SU2/2526/0006',                            '2026-05-16', 'RCPT/S006','upi',   406980,c2),
      ('receipt', pa2_3, 107520, 'Against SU2/2526/0007',                            '2026-05-22', 'RCPT/S007','cheque',514500,c2),
      ('receipt', pa2_1, 67032,  'Against SU2/2526/0009',                            '2026-06-06', 'RCPT/S008','upi',   581532,c2),
      ('payment', pa2_5, 158760, 'Raw material — PUR/SU2/0001',                     '2026-04-08', 'PAY/S001', 'cheque',422772,c2),
      ('payment', pa2_6, 55124,  'Transport — PUR/SU2/0002',                        '2026-04-20', 'PAY/S002', 'cash',  367648,c2),
      ('payment', pa2_5, 187424, 'Raw material — PUR/SU2/0003',                     '2026-05-10', 'PAY/S003', 'cheque',180224,c2),
      (NULL, NULL, 54600,  'TNEB Electricity bill — April 2026',                    '2026-04-30', 'OPEX/S001','cheque',125624,c2),
      (NULL, NULL, 40500,  'Diesel — 375 litres @ ₹108',                            '2026-04-26', 'OPEX/S002','cash',   85124,c2),
      (NULL, NULL, 58400,  'TNEB Electricity bill — May 2026',                      '2026-05-31', 'OPEX/S003','cheque', 26724,c2),
      (NULL, NULL, 9200,   'VSI Crusher maintenance — April',                       '2026-04-10', 'OPEX/S004','cash',   17524,c2),
      (NULL, NULL, 9200,   'VSI Crusher maintenance — May',                         '2026-05-10', 'OPEX/S005','cash',    8324,c2)
    ON CONFLICT DO NOTHING;
  END IF;

END $$;
