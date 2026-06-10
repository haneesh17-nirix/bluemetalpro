-- =============================================================
-- 007_seed_test_data.sql  — Demo data for two crusher units
-- Idempotent: uses ON CONFLICT / IF NOT EXISTS checks throughout.
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
  s UUID;

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
  INSERT INTO products (name, hsn_code, category, unit, default_sale_price, default_purchase_price, gst_rate, crusher_id) VALUES
    ('M-Sand',              '25171010', 'm_sand',     'MT', 850,  420, 5, c1),
    ('P-Sand',              '25171010', 'p_sand',     'MT', 950,  460, 5, c1),
    ('20mm Blue Metal',     '25171010', 'aggregates', 'MT', 1100, 530, 5, c1),
    ('40mm Blue Metal',     '25171010', 'aggregates', 'MT', 980,  500, 5, c1),
    ('6mm Chips',           '25171010', 'aggregates', 'MT', 750,  380, 5, c1)
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
  INSERT INTO vehicles (registration_number, owner_name, vehicle_type, capacity_mt, status, crusher_id) VALUES
    ('TN33 AC 1234', 'Murugan',   'Tipper',  10, 'active', c1),
    ('TN33 AC 5678', 'Selvam',    'Tipper',  12, 'active', c1),
    ('KA01 BX 9012', 'Ravi Kumar','Tipper',  14, 'active', c1),
    ('TN33 AD 3456', 'Pandian',   'Tractor',  6, 'active', c1)
  ON CONFLICT (registration_number) DO NOTHING;
  SELECT id INTO v1_1 FROM vehicles WHERE registration_number = 'TN33 AC 1234' AND crusher_id = c1 LIMIT 1;
  SELECT id INTO v1_2 FROM vehicles WHERE registration_number = 'TN33 AC 5678' AND crusher_id = c1 LIMIT 1;
  SELECT id INTO v1_3 FROM vehicles WHERE registration_number = 'KA01 BX 9012' AND crusher_id = c1 LIMIT 1;
  SELECT id INTO v1_4 FROM vehicles WHERE registration_number = 'TN33 AD 3456' AND crusher_id = c1 LIMIT 1;

  -- Workers (no unique constraint — use IF NOT EXISTS)
  IF NOT EXISTS (SELECT 1 FROM workers WHERE name = 'Arumugam K' AND crusher_id = c1) THEN
    INSERT INTO workers (name, phone, designation, wage_type, wage_rate, joining_date, crusher_id)
    VALUES ('Arumugam K', '9876501001', 'Machine Operator', 'daily', 650, '2023-03-01', c1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM workers WHERE name = 'Balamurugan R' AND crusher_id = c1) THEN
    INSERT INTO workers (name, phone, designation, wage_type, wage_rate, joining_date, crusher_id)
    VALUES ('Balamurugan R', '9876501002', 'Crusher Supervisor', 'monthly', 18000, '2022-11-15', c1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM workers WHERE name = 'Chinnaswamy P' AND crusher_id = c1) THEN
    INSERT INTO workers (name, phone, designation, wage_type, wage_rate, joining_date, crusher_id)
    VALUES ('Chinnaswamy P', '9876501003', 'Helper', 'daily', 450, '2024-01-10', c1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM workers WHERE name = 'Dhivya S' AND crusher_id = c1) THEN
    INSERT INTO workers (name, phone, designation, wage_type, wage_rate, joining_date, crusher_id)
    VALUES ('Dhivya S', '9876501004', 'Weighbridge Operator', 'monthly', 14000, '2023-07-01', c1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM workers WHERE name = 'Eswaran M' AND crusher_id = c1) THEN
    INSERT INTO workers (name, phone, designation, wage_type, wage_rate, joining_date, crusher_id)
    VALUES ('Eswaran M', '9876501005', 'Driver', 'daily', 600, '2023-05-20', c1);
  END IF;
  SELECT id INTO w1_1 FROM workers WHERE name = 'Arumugam K'    AND crusher_id = c1 LIMIT 1;
  SELECT id INTO w1_2 FROM workers WHERE name = 'Balamurugan R' AND crusher_id = c1 LIMIT 1;
  SELECT id INTO w1_3 FROM workers WHERE name = 'Chinnaswamy P' AND crusher_id = c1 LIMIT 1;
  SELECT id INTO w1_4 FROM workers WHERE name = 'Dhivya S'      AND crusher_id = c1 LIMIT 1;
  SELECT id INTO w1_5 FROM workers WHERE name = 'Eswaran M'     AND crusher_id = c1 LIMIT 1;

  -- Assets (no unique constraint — use IF NOT EXISTS)
  IF NOT EXISTS (SELECT 1 FROM assets WHERE name = 'Jaw Crusher 30x24' AND crusher_id = c1) THEN
    INSERT INTO assets (name, asset_type, serial_number, purchase_date, purchase_cost, crusher_id)
    VALUES ('Jaw Crusher 30x24', 'machinery', 'JC-30-24-2022', '2022-01-15', 3500000, c1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM assets WHERE name = 'Tipper Truck MH014' AND crusher_id = c1) THEN
    INSERT INTO assets (name, asset_type, serial_number, purchase_date, purchase_cost, crusher_id)
    VALUES ('Tipper Truck MH014', 'vehicle', 'TK-MH014-2021', '2021-06-10', 1200000, c1);
  END IF;
  SELECT id INTO a1_crusher FROM assets WHERE name = 'Jaw Crusher 30x24'  AND crusher_id = c1 LIMIT 1;
  SELECT id INTO a1_truck   FROM assets WHERE name = 'Tipper Truck MH014' AND crusher_id = c1 LIMIT 1;

  -- ── Sales — Unit 1 (3 months: Apr, May, Jun 2026) ─────────────
  IF pa1_1 IS NOT NULL AND p1_msand IS NOT NULL THEN
    INSERT INTO sales (invoice_number, party_id, sale_date,
                       subtotal, taxable_amount, cgst_amount, sgst_amount, total_tax, grand_total,
                       amount_received, balance_due, payment_mode, status,
                       vehicle_id, crusher_id, created_by)
    VALUES
      ('HU1/2526/0001', pa1_1,'2026-04-03', 42500,  42500,  1062.5,  1062.5,  2125,    44625,   44625,   0,     'cash',  'confirmed', v1_1, c1, u_sales),
      ('HU1/2526/0002', pa1_2,'2026-04-07', 66000,  66000,  1650,    1650,    3300,    69300,   69300,   0,     'upi',   'confirmed', v1_2, c1, u_sales),
      ('HU1/2526/0003', pa1_3,'2026-04-11', 38250,  38250,  956.25,  956.25,  1912.5,  40162.5, 40162.5, 0,     'cash',  'confirmed', v1_1, c1, u_sales),
      ('HU1/2526/0004', pa1_4,'2026-04-16', 88000,  88000,  2200,    2200,    4400,    92400,   92400,   0,     'cheque','confirmed', v1_3, c1, u_sales),
      ('HU1/2526/0005', pa1_1,'2026-04-22', 55250,  55250,  1381.25, 1381.25, 2762.5,  58012.5, 58012.5, 0,     'upi',   'confirmed', v1_2, c1, u_sales),
      ('HU1/2526/0006', pa1_2,'2026-04-28', 49500,  49500,  1237.5,  1237.5,  2475,    51975,   0,       51975, 'credit','confirmed', v1_4, c1, u_sales),
      ('HU1/2526/0007', pa1_3,'2026-05-04', 67200,  67200,  1680,    1680,    3360,    70560,   70560,   0,     'upi',   'confirmed', v1_1, c1, u_sales),
      ('HU1/2526/0008', pa1_4,'2026-05-09', 110000, 110000, 2750,    2750,    5500,    115500,  115500,  0,     'cheque','confirmed', v1_3, c1, u_sales),
      ('HU1/2526/0009', pa1_1,'2026-05-14', 42500,  42500,  1062.5,  1062.5,  2125,    44625,   44625,   0,     'cash',  'confirmed', v1_2, c1, u_sales),
      ('HU1/2526/0010', pa1_2,'2026-05-20', 76000,  76000,  1900,    1900,    3800,    79800,   79800,   0,     'upi',   'confirmed', v1_1, c1, u_sales),
      ('HU1/2526/0011', pa1_3,'2026-05-25', 58500,  58500,  1462.5,  1462.5,  2925,    61425,   61425,   0,     'cash',  'confirmed', v1_4, c1, u_sales),
      ('HU1/2526/0012', pa1_4,'2026-05-30', 93500,  93500,  2337.5,  2337.5,  4675,    98175,   0,       98175, 'credit','confirmed', v1_2, c1, u_sales),
      ('HU1/2526/0013', pa1_1,'2026-06-03', 51000,  51000,  1275,    1275,    2550,    53550,   53550,   0,     'upi',   'confirmed', v1_1, c1, u_sales),
      ('HU1/2526/0014', pa1_2,'2026-06-06', 63800,  63800,  1595,    1595,    3190,    66990,   66990,   0,     'cash',  'confirmed', v1_3, c1, u_sales),
      ('HU1/2526/0015', pa1_3,'2026-06-09', 47600,  47600,  1190,    1190,    2380,    49980,   49980,   0,     'upi',   'confirmed', v1_2, c1, u_sales)
    ON CONFLICT (invoice_number) DO NOTHING;

    -- Sale items (idempotent: check by sale_id)
    SELECT id INTO s FROM sales WHERE crusher_id = c1 AND invoice_number = 'HU1/2526/0001' LIMIT 1;
    IF s IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sale_items WHERE sale_id = s) THEN
      INSERT INTO sale_items (sale_id, product_id, product_name, hsn_code, unit, quantity, rate, amount,
                              gst_rate, cgst_rate, sgst_rate, cgst_amount, sgst_amount, total_amount)
      VALUES (s, p1_msand, 'M-Sand', '25171010', 'MT', 50, 850, 42500, 5, 2.5, 2.5, 1062.5, 1062.5, 44625);
    END IF;

    SELECT id INTO s FROM sales WHERE crusher_id = c1 AND invoice_number = 'HU1/2526/0002' LIMIT 1;
    IF s IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sale_items WHERE sale_id = s) THEN
      INSERT INTO sale_items (sale_id, product_id, product_name, hsn_code, unit, quantity, rate, amount,
                              gst_rate, cgst_rate, sgst_rate, cgst_amount, sgst_amount, total_amount)
      VALUES (s, p1_20mm, '20mm Blue Metal', '25171010', 'MT', 60, 1100, 66000, 5, 2.5, 2.5, 1650, 1650, 69300);
    END IF;

    SELECT id INTO s FROM sales WHERE crusher_id = c1 AND invoice_number = 'HU1/2526/0003' LIMIT 1;
    IF s IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sale_items WHERE sale_id = s) THEN
      INSERT INTO sale_items (sale_id, product_id, product_name, hsn_code, unit, quantity, rate, amount,
                              gst_rate, cgst_rate, sgst_rate, cgst_amount, sgst_amount, total_amount)
      VALUES
        (s, p1_psand, 'P-Sand',    '25171010', 'MT', 40,   950, 38000,  5, 2.5, 2.5, 950,    950,    39900),
        (s, p1_6mm,   '6mm Chips', '25171010', 'MT', 0.33, 750, 247.5,  5, 2.5, 2.5, 6.1875, 6.1875, 259.875);
    END IF;

    SELECT id INTO s FROM sales WHERE crusher_id = c1 AND invoice_number = 'HU1/2526/0004' LIMIT 1;
    IF s IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sale_items WHERE sale_id = s) THEN
      INSERT INTO sale_items (sale_id, product_id, product_name, hsn_code, unit, quantity, rate, amount,
                              gst_rate, cgst_rate, sgst_rate, cgst_amount, sgst_amount, total_amount)
      VALUES
        (s, p1_40mm, '40mm Blue Metal', '25171010', 'MT', 80,  980,  78400, 5, 2.5, 2.5, 1960,  1960,  82320),
        (s, p1_20mm, '20mm Blue Metal', '25171010', 'MT', 8.8, 1100, 9680,  5, 2.5, 2.5, 242,   242,   10164);
    END IF;

    SELECT id INTO s FROM sales WHERE crusher_id = c1 AND invoice_number = 'HU1/2526/0008' LIMIT 1;
    IF s IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sale_items WHERE sale_id = s) THEN
      INSERT INTO sale_items (sale_id, product_id, product_name, hsn_code, unit, quantity, rate, amount,
                              gst_rate, cgst_rate, sgst_rate, cgst_amount, sgst_amount, total_amount)
      VALUES
        (s, p1_msand, 'M-Sand', '25171010', 'MT', 60,   850, 51000, 5, 2.5, 2.5, 1275, 1275, 53550),
        (s, p1_psand, 'P-Sand', '25171010', 'MT', 62.1, 950, 59000, 5, 2.5, 2.5, 1475, 1475, 61950);
    END IF;
  END IF;

  -- Purchases — Unit 1 (no UNIQUE on bill_number — use IF NOT EXISTS)
  IF pa1_5 IS NOT NULL AND p1_msand IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM purchases WHERE bill_number = 'PUR/HU1/0001' AND crusher_id = c1) THEN
      INSERT INTO purchases (bill_number, party_id, purchase_date, subtotal, taxable_amount,
                             cgst_amount, sgst_amount, grand_total,
                             amount_paid, balance_due, payment_mode, crusher_id, created_by)
      VALUES ('PUR/HU1/0001', pa1_5, '2026-04-05', 126000, 126000, 3150, 3150, 132300, 132300, 0, 'cheque', c1, u_accounts);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM purchases WHERE bill_number = 'PUR/HU1/0002' AND crusher_id = c1) THEN
      INSERT INTO purchases (bill_number, party_id, purchase_date, subtotal, taxable_amount,
                             cgst_amount, sgst_amount, grand_total,
                             amount_paid, balance_due, payment_mode, crusher_id, created_by)
      VALUES ('PUR/HU1/0002', pa1_5, '2026-04-20', 105000, 105000, 2625, 2625, 110250, 110250, 0, 'upi', c1, u_accounts);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM purchases WHERE bill_number = 'PUR/HU1/0003' AND crusher_id = c1) THEN
      INSERT INTO purchases (bill_number, party_id, purchase_date, subtotal, taxable_amount,
                             cgst_amount, sgst_amount, grand_total,
                             amount_paid, balance_due, payment_mode, crusher_id, created_by)
      VALUES ('PUR/HU1/0003', pa1_6, '2026-04-28', 42000, 42000, 1050, 1050, 44100, 44100, 0, 'cash', c1, u_accounts);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM purchases WHERE bill_number = 'PUR/HU1/0004' AND crusher_id = c1) THEN
      INSERT INTO purchases (bill_number, party_id, purchase_date, subtotal, taxable_amount,
                             cgst_amount, sgst_amount, grand_total,
                             amount_paid, balance_due, payment_mode, crusher_id, created_by)
      VALUES ('PUR/HU1/0004', pa1_5, '2026-05-10', 189000, 189000, 4725, 4725, 198450, 198450, 0, 'cheque', c1, u_accounts);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM purchases WHERE bill_number = 'PUR/HU1/0005' AND crusher_id = c1) THEN
      INSERT INTO purchases (bill_number, party_id, purchase_date, subtotal, taxable_amount,
                             cgst_amount, sgst_amount, grand_total,
                             amount_paid, balance_due, payment_mode, crusher_id, created_by)
      VALUES ('PUR/HU1/0005', pa1_6, '2026-05-22', 56000, 56000, 1400, 1400, 58800, 58800, 0, 'cash', c1, u_accounts);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM purchases WHERE bill_number = 'PUR/HU1/0006' AND crusher_id = c1) THEN
      INSERT INTO purchases (bill_number, party_id, purchase_date, subtotal, taxable_amount,
                             cgst_amount, sgst_amount, grand_total,
                             amount_paid, balance_due, payment_mode, crusher_id, created_by)
      VALUES ('PUR/HU1/0006', pa1_5, '2026-06-05', 147000, 147000, 3675, 3675, 154350, 0, 154350, 'cheque', c1, u_accounts);
    END IF;

    -- Purchase items
    SELECT id INTO s FROM purchases WHERE crusher_id = c1 AND bill_number = 'PUR/HU1/0001' LIMIT 1;
    IF s IS NOT NULL AND NOT EXISTS (SELECT 1 FROM purchase_items WHERE purchase_id = s) THEN
      INSERT INTO purchase_items (purchase_id, product_id, product_name, unit, quantity, rate, amount,
                                  gst_rate, cgst_amount, sgst_amount, total_amount)
      VALUES (s, p1_msand, 'M-Sand', 'MT', 300, 420, 126000, 5, 3150, 3150, 132300);
    END IF;

    SELECT id INTO s FROM purchases WHERE crusher_id = c1 AND bill_number = 'PUR/HU1/0004' LIMIT 1;
    IF s IS NOT NULL AND NOT EXISTS (SELECT 1 FROM purchase_items WHERE purchase_id = s) THEN
      INSERT INTO purchase_items (purchase_id, product_id, product_name, unit, quantity, rate, amount,
                                  gst_rate, cgst_amount, sgst_amount, total_amount)
      VALUES
        (s, p1_20mm, '20mm Blue Metal', 'MT', 300,  530, 159000, 5, 3975, 3975, 166950),
        (s, p1_psand, 'P-Sand',         'MT', 65.2, 460, 29992, 5, 749.8, 749.8, 31491.6);
    END IF;
  END IF;

  -- Quarry sales — Unit 1
  IF pa1_3 IS NOT NULL THEN
    INSERT INTO quarry_sales (invoice_number, party_id, vehicle_id, product_name, quantity, unit,
                              rate, royalty_rate, amount, royalty_amount, grand_total, sale_date, crusher_id, created_by)
    VALUES
      ('QU1/2526/0001', pa1_3, v1_1, 'Blue Metal Rock', 120, 'MT', 180, 55, 21600, 6600,  28200, '2026-04-02', c1, u_sales),
      ('QU1/2526/0002', pa1_4, v1_2, 'Blue Metal Rock', 200, 'MT', 180, 55, 36000, 11000, 47000, '2026-04-10', c1, u_sales),
      ('QU1/2526/0003', pa1_3, v1_3, 'Blue Metal Rock', 150, 'MT', 185, 55, 27750, 8250,  36000, '2026-04-19', c1, u_sales),
      ('QU1/2526/0004', pa1_4, v1_1, 'Earth & Soil',     80, 'MT', 120, 30, 9600,  2400,  12000, '2026-05-03', c1, u_sales),
      ('QU1/2526/0005', pa1_3, v1_2, 'Blue Metal Rock', 180, 'MT', 185, 55, 33300, 9900,  43200, '2026-05-15', c1, u_sales),
      ('QU1/2526/0006', pa1_4, v1_4, 'Blue Metal Rock', 220, 'MT', 185, 55, 40700, 12100, 52800, '2026-05-28', c1, u_sales),
      ('QU1/2526/0007', pa1_3, v1_1, 'Blue Metal Rock', 160, 'MT', 190, 55, 30400, 8800,  39200, '2026-06-07', c1, u_sales)
    ON CONFLICT (invoice_number) DO NOTHING;
  END IF;

  -- Maintenance records — Unit 1 (no unique constraint — use IF NOT EXISTS by title+scheduled_date+asset_id)
  IF a1_crusher IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM maintenance_records WHERE asset_id = a1_crusher AND title = 'Monthly jaw plate inspection' AND scheduled_date = '2026-04-05') THEN
      INSERT INTO maintenance_records (asset_id, asset_type, title, description, scheduled_date, completed_date,
                                       cost, vendor_name, next_service_date, status, crusher_id)
      VALUES (a1_crusher, 'machinery', 'Monthly jaw plate inspection', 'Jaw plate check and lubrication',
              '2026-04-05', '2026-04-05', 8500, 'Crusher Care Services', '2026-05-05', 'completed', c1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM maintenance_records WHERE asset_id = a1_crusher AND title = 'Toggle plate replacement' AND scheduled_date = '2026-04-18') THEN
      INSERT INTO maintenance_records (asset_id, asset_type, title, description, scheduled_date, completed_date,
                                       cost, vendor_name, next_service_date, status, crusher_id)
      VALUES (a1_crusher, 'machinery', 'Toggle plate replacement', 'Replacement after excessive vibration detected',
              '2026-04-18', '2026-04-18', 24000, 'Metso Parts India', '2026-07-18', 'completed', c1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM maintenance_records WHERE asset_id = a1_truck AND title = 'Quarterly tyre & brake check' AND scheduled_date = '2026-05-02') THEN
      INSERT INTO maintenance_records (asset_id, asset_type, title, description, scheduled_date, completed_date,
                                       cost, vendor_name, next_service_date, status, crusher_id)
      VALUES (a1_truck, 'vehicle', 'Quarterly tyre & brake check', 'Tyre rotation and brake inspection',
              '2026-05-02', '2026-05-02', 5200, 'Hosur Tyres & Auto', '2026-08-02', 'completed', c1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM maintenance_records WHERE asset_id = a1_crusher AND title = 'Monthly jaw plate inspection' AND scheduled_date = '2026-05-05') THEN
      INSERT INTO maintenance_records (asset_id, asset_type, title, description, scheduled_date, completed_date,
                                       cost, vendor_name, next_service_date, status, crusher_id)
      VALUES (a1_crusher, 'machinery', 'Monthly jaw plate inspection', 'Jaw plate check and lubrication',
              '2026-05-05', '2026-05-05', 8500, 'Crusher Care Services', '2026-06-05', 'completed', c1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM maintenance_records WHERE asset_id = a1_crusher AND title = 'Belt tension & conveyor alignment' AND scheduled_date = '2026-06-01') THEN
      INSERT INTO maintenance_records (asset_id, asset_type, title, description, scheduled_date, completed_date,
                                       cost, vendor_name, next_service_date, status, crusher_id)
      VALUES (a1_crusher, 'machinery', 'Belt tension & conveyor alignment', 'Preventive belt and conveyor check',
              '2026-06-01', NULL, 3800, 'Crusher Care Services', '2026-09-01', 'scheduled', c1);
    END IF;
  END IF;

  -- Attendance — Unit 1 (last 30 working days)
  IF w1_1 IS NOT NULL THEN
    INSERT INTO attendance (worker_id, date, status, crusher_id) VALUES
      (w1_1, '2026-05-05', 'present',  c1),(w1_1,'2026-05-06','present',  c1),(w1_1,'2026-05-07','present', c1),
      (w1_1, '2026-05-08', 'absent',   c1),(w1_1,'2026-05-09','present',  c1),(w1_1,'2026-05-12','present', c1),
      (w1_1, '2026-05-13', 'present',  c1),(w1_1,'2026-05-14','half_day', c1),(w1_1,'2026-05-15','present', c1),
      (w1_2, '2026-05-05', 'present',  c1),(w1_2,'2026-05-06','present',  c1),(w1_2,'2026-05-07','present', c1),
      (w1_2, '2026-05-08', 'present',  c1),(w1_2,'2026-05-09','present',  c1),(w1_2,'2026-05-12','present', c1),
      (w1_3, '2026-05-05', 'present',  c1),(w1_3,'2026-05-06','absent',   c1),(w1_3,'2026-05-07','present', c1),
      (w1_3, '2026-05-08', 'present',  c1),(w1_3,'2026-05-09','absent',   c1),(w1_3,'2026-05-12','present', c1),
      (w1_4, '2026-05-05', 'present',  c1),(w1_4,'2026-05-06','present',  c1),(w1_4,'2026-05-07','present', c1),
      (w1_4, '2026-05-08', 'present',  c1),(w1_4,'2026-05-09','present',  c1),(w1_4,'2026-05-12','leave',   c1),
      (w1_5, '2026-05-05', 'present',  c1),(w1_5,'2026-05-06','present',  c1),(w1_5,'2026-05-07','absent',  c1),
      (w1_5, '2026-05-08', 'present',  c1),(w1_5,'2026-05-09','present',  c1),(w1_5,'2026-05-12','present', c1)
    ON CONFLICT (worker_id, date) DO NOTHING;
  END IF;

  -- Wage payments — Unit 1
  IF w1_1 IS NOT NULL THEN
    INSERT INTO wage_payments (worker_id, period_from, period_to, days_worked, gross_wages,
                               deductions, net_wages, payment_date, payment_mode, crusher_id)
    VALUES
      (w1_1, '2026-04-01','2026-04-30', 26, 16900, 0,    16900, '2026-05-01','cash', c1),
      (w1_2, '2026-04-01','2026-04-30', 26, 18000, 500,  17500, '2026-05-01','upi',  c1),
      (w1_3, '2026-04-01','2026-04-30', 24, 10800, 0,    10800, '2026-05-01','cash', c1),
      (w1_4, '2026-04-01','2026-04-30', 26, 14000, 0,    14000, '2026-05-01','upi',  c1),
      (w1_5, '2026-04-01','2026-04-30', 25, 15000, 1000, 14000, '2026-05-01','cash', c1),
      (w1_1, '2026-05-01','2026-05-31', 27, 17550, 0,    17550, '2026-06-01','cash', c1),
      (w1_2, '2026-05-01','2026-05-31', 27, 18000, 0,    18000, '2026-06-01','upi',  c1),
      (w1_3, '2026-05-01','2026-05-31', 25, 11250, 0,    11250, '2026-06-01','cash', c1),
      (w1_4, '2026-05-01','2026-05-31', 27, 14000, 0,    14000, '2026-06-01','upi',  c1),
      (w1_5, '2026-05-01','2026-05-31', 26, 15600, 0,    15600, '2026-06-01','cash', c1)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Ledger — Unit 1 (receipts + payments + opex journal entries)
  IF pa1_1 IS NOT NULL THEN
    INSERT INTO ledger_transactions (txn_type, party_id, amount, narration, txn_date, payment_mode, crusher_id)
    VALUES
      -- Receipts from customers
      ('receipt', pa1_1, 44625,  'Against HU1/2526/0001 — M-Sand supply',              '2026-04-05', 'cash',   c1),
      ('receipt', pa1_2, 69300,  'Against HU1/2526/0002 — 20mm Blue Metal',            '2026-04-09', 'upi',    c1),
      ('receipt', pa1_3, 40162,  'Against HU1/2526/0003 — P-Sand + 6mm',              '2026-04-14', 'cash',   c1),
      ('receipt', pa1_4, 92400,  'Against HU1/2526/0004 — 40mm + 20mm supply',        '2026-04-18', 'cheque', c1),
      ('receipt', pa1_1, 58012,  'Against HU1/2526/0005 — M-Sand supply',              '2026-04-24', 'upi',    c1),
      ('receipt', pa1_3, 70560,  'Against HU1/2526/0007 — P-Sand supply',              '2026-05-07', 'upi',    c1),
      ('receipt', pa1_4, 115500, 'Against HU1/2526/0008 — Bulk supply',                '2026-05-12', 'cheque', c1),
      ('receipt', pa1_1, 44625,  'Against HU1/2526/0009',                              '2026-05-17', 'cash',   c1),
      ('receipt', pa1_2, 79800,  'Against HU1/2526/0010',                              '2026-05-23', 'upi',    c1),
      ('receipt', pa1_1, 53550,  'Against HU1/2526/0013',                              '2026-06-05', 'upi',    c1),
      -- Payments to suppliers
      ('payment', pa1_5, 132300, 'Raw material — Ponni Granites PUR/HU1/0001',        '2026-04-06', 'cheque', c1),
      ('payment', pa1_6, 44100,  'Transport charges — Karthik Transport PUR/HU1/0003','2026-04-30', 'cash',   c1),
      ('payment', pa1_5, 198450, 'Raw material — PUR/HU1/0004',                       '2026-05-12', 'cheque', c1),
      ('payment', pa1_6, 58800,  'Transport charges — PUR/HU1/0005',                  '2026-05-25', 'cash',   c1),
      -- Opex journal entries (no party)
      ('journal', NULL,  58400,  'TNEB Electricity bill — April 2026',                '2026-04-30', 'cheque', c1),
      ('journal', NULL,  43200,  'Diesel — 400 litres @ Rs.108',                      '2026-04-25', 'cash',   c1),
      ('journal', NULL,  62300,  'TNEB Electricity bill — May 2026',                  '2026-05-31', 'cheque', c1),
      ('journal', NULL,  48600,  'Diesel — 450 litres @ Rs.108',                      '2026-05-27', 'cash',   c1),
      ('journal', NULL,  12000,  'Site security charges — April + May',               '2026-05-05', 'cash',   c1),
      ('journal', NULL,  8500,   'Crusher maintenance — April',                       '2026-04-07', 'cash',   c1)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ==============================================================
  -- UNIT 2 — SALEM
  -- ==============================================================

  -- Products
  INSERT INTO products (name, hsn_code, category, unit, default_sale_price, default_purchase_price, gst_rate, crusher_id) VALUES
    ('M-Sand',          '25171010', 'm_sand',     'MT', 870,  430, 5, c2),
    ('P-Sand',          '25171010', 'p_sand',     'MT', 970,  470, 5, c2),
    ('20mm Blue Metal', '25171010', 'aggregates', 'MT', 1120, 540, 5, c2),
    ('40mm Blue Metal', '25171010', 'aggregates', 'MT', 1000, 510, 5, c2),
    ('Quarry Dust',     '25171010', 'dust',       'MT', 600,  280, 5, c2)
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
  INSERT INTO vehicles (registration_number, owner_name, vehicle_type, capacity_mt, status, crusher_id) VALUES
    ('TN30 AK 4455', 'Sivakumar',  'Tipper', 10, 'active', c2),
    ('TN30 AK 6677', 'Manikandan', 'Tipper', 12, 'active', c2),
    ('TN30 BL 8899', 'Anbazhagan', 'Tipper', 14, 'active', c2)
  ON CONFLICT (registration_number) DO NOTHING;
  SELECT id INTO v2_1 FROM vehicles WHERE registration_number = 'TN30 AK 4455' AND crusher_id = c2 LIMIT 1;
  SELECT id INTO v2_2 FROM vehicles WHERE registration_number = 'TN30 AK 6677' AND crusher_id = c2 LIMIT 1;
  SELECT id INTO v2_3 FROM vehicles WHERE registration_number = 'TN30 BL 8899' AND crusher_id = c2 LIMIT 1;

  -- Workers (no unique constraint — use IF NOT EXISTS)
  IF NOT EXISTS (SELECT 1 FROM workers WHERE name = 'Govindasamy T' AND crusher_id = c2) THEN
    INSERT INTO workers (name, phone, designation, wage_type, wage_rate, joining_date, crusher_id)
    VALUES ('Govindasamy T', '9944501001', 'Machine Operator', 'daily', 670, '2023-01-15', c2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM workers WHERE name = 'Hariharan S' AND crusher_id = c2) THEN
    INSERT INTO workers (name, phone, designation, wage_type, wage_rate, joining_date, crusher_id)
    VALUES ('Hariharan S', '9944501002', 'Crusher Supervisor', 'monthly', 19000, '2022-08-01', c2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM workers WHERE name = 'Ilayaraja P' AND crusher_id = c2) THEN
    INSERT INTO workers (name, phone, designation, wage_type, wage_rate, joining_date, crusher_id)
    VALUES ('Ilayaraja P', '9944501003', 'Helper', 'daily', 460, '2024-03-01', c2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM workers WHERE name = 'Jeyaraman K' AND crusher_id = c2) THEN
    INSERT INTO workers (name, phone, designation, wage_type, wage_rate, joining_date, crusher_id)
    VALUES ('Jeyaraman K', '9944501004', 'Driver', 'daily', 610, '2023-09-10', c2);
  END IF;
  SELECT id INTO w2_1 FROM workers WHERE name = 'Govindasamy T' AND crusher_id = c2 LIMIT 1;
  SELECT id INTO w2_2 FROM workers WHERE name = 'Hariharan S'   AND crusher_id = c2 LIMIT 1;
  SELECT id INTO w2_3 FROM workers WHERE name = 'Ilayaraja P'   AND crusher_id = c2 LIMIT 1;
  SELECT id INTO w2_4 FROM workers WHERE name = 'Jeyaraman K'   AND crusher_id = c2 LIMIT 1;

  -- Assets (no unique constraint — use IF NOT EXISTS)
  IF NOT EXISTS (SELECT 1 FROM assets WHERE name = 'VSI Crusher Salem' AND crusher_id = c2) THEN
    INSERT INTO assets (name, asset_type, serial_number, purchase_date, purchase_cost, crusher_id)
    VALUES ('VSI Crusher Salem', 'machinery', 'VSI-SLM-2023', '2023-03-20', 4200000, c2);
  END IF;
  SELECT id INTO a2_crusher FROM assets WHERE name = 'VSI Crusher Salem' AND crusher_id = c2 LIMIT 1;

  -- Sales — Unit 2
  IF pa2_1 IS NOT NULL AND p2_msand IS NOT NULL THEN
    INSERT INTO sales (invoice_number, party_id, sale_date,
                       subtotal, taxable_amount, cgst_amount, sgst_amount, total_tax, grand_total,
                       amount_received, balance_due, payment_mode, status,
                       vehicle_id, crusher_id, created_by)
    VALUES
      ('SU2/2526/0001', pa2_1, '2026-04-04',  52200,  52200,  1305,   1305,   2610,   54810,  54810, 0,     'upi',   'confirmed', v2_1, c2, u_sales),
      ('SU2/2526/0002', pa2_2, '2026-04-09',  67200,  67200,  1680,   1680,   3360,   70560,  70560, 0,     'cheque','confirmed', v2_2, c2, u_sales),
      ('SU2/2526/0003', pa2_3, '2026-04-15',  89600,  89600,  2240,   2240,   4480,   94080,  94080, 0,     'cheque','confirmed', v2_3, c2, u_sales),
      ('SU2/2526/0004', pa2_4, '2026-04-22',  43500,  43500,  1087.5, 1087.5, 2175,   45675,  45675, 0,     'upi',   'confirmed', v2_1, c2, u_sales),
      ('SU2/2526/0005', pa2_1, '2026-05-06',  78400,  78400,  1960,   1960,   3920,   82320,  82320, 0,     'cheque','confirmed', v2_2, c2, u_sales),
      ('SU2/2526/0006', pa2_2, '2026-05-13',  56700,  56700,  1417.5, 1417.5, 2835,   59535,  59535, 0,     'upi',   'confirmed', v2_3, c2, u_sales),
      ('SU2/2526/0007', pa2_3, '2026-05-19', 102400, 102400,  2560,   2560,   5120,  107520, 107520, 0,     'cheque','confirmed', v2_1, c2, u_sales),
      ('SU2/2526/0008', pa2_4, '2026-05-26',  47100,  47100,  1177.5, 1177.5, 2355,   49455,  0,    49455,  'upi',   'confirmed', v2_2, c2, u_sales),
      ('SU2/2526/0009', pa2_1, '2026-06-04',  63840,  63840,  1596,   1596,   3192,   67032,  67032, 0,     'upi',   'confirmed', v2_3, c2, u_sales),
      ('SU2/2526/0010', pa2_2, '2026-06-08',  84000,  84000,  2100,   2100,   4200,   88200,  88200, 0,     'cheque','confirmed', v2_1, c2, u_sales)
    ON CONFLICT (invoice_number) DO NOTHING;

    -- Sale items
    SELECT id INTO s FROM sales WHERE crusher_id = c2 AND invoice_number = 'SU2/2526/0001' LIMIT 1;
    IF s IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sale_items WHERE sale_id = s) THEN
      INSERT INTO sale_items (sale_id, product_id, product_name, hsn_code, unit, quantity, rate, amount,
                              gst_rate, cgst_rate, sgst_rate, cgst_amount, sgst_amount, total_amount)
      VALUES (s, p2_msand, 'M-Sand', '25171010', 'MT', 60, 870, 52200, 5, 2.5, 2.5, 1305, 1305, 54810);
    END IF;

    SELECT id INTO s FROM sales WHERE crusher_id = c2 AND invoice_number = 'SU2/2526/0002' LIMIT 1;
    IF s IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sale_items WHERE sale_id = s) THEN
      INSERT INTO sale_items (sale_id, product_id, product_name, hsn_code, unit, quantity, rate, amount,
                              gst_rate, cgst_rate, sgst_rate, cgst_amount, sgst_amount, total_amount)
      VALUES (s, p2_20mm, '20mm Blue Metal', '25171010', 'MT', 60, 1120, 67200, 5, 2.5, 2.5, 1680, 1680, 70560);
    END IF;

    SELECT id INTO s FROM sales WHERE crusher_id = c2 AND invoice_number = 'SU2/2526/0003' LIMIT 1;
    IF s IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sale_items WHERE sale_id = s) THEN
      INSERT INTO sale_items (sale_id, product_id, product_name, hsn_code, unit, quantity, rate, amount,
                              gst_rate, cgst_rate, sgst_rate, cgst_amount, sgst_amount, total_amount)
      VALUES
        (s, p2_40mm, '40mm Blue Metal', '25171010', 'MT', 80,  1000, 80000, 5, 2.5, 2.5, 2000,  2000,  84000),
        (s, p2_psand, 'P-Sand',         '25171010', 'MT', 9.9, 970,  9603,  5, 2.5, 2.5, 240.075, 240.075, 10083.15);
    END IF;
  END IF;

  -- Purchases — Unit 2 (no UNIQUE on bill_number — use IF NOT EXISTS)
  IF pa2_5 IS NOT NULL AND p2_20mm IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM purchases WHERE bill_number = 'PUR/SU2/0001' AND crusher_id = c2) THEN
      INSERT INTO purchases (bill_number, party_id, purchase_date, subtotal, taxable_amount,
                             cgst_amount, sgst_amount, grand_total,
                             amount_paid, balance_due, payment_mode, crusher_id, created_by)
      VALUES ('PUR/SU2/0001', pa2_5, '2026-04-06', 151200, 151200, 3780, 3780, 158760, 158760, 0, 'cheque', c2, u_accounts);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM purchases WHERE bill_number = 'PUR/SU2/0002' AND crusher_id = c2) THEN
      INSERT INTO purchases (bill_number, party_id, purchase_date, subtotal, taxable_amount,
                             cgst_amount, sgst_amount, grand_total,
                             amount_paid, balance_due, payment_mode, crusher_id, created_by)
      VALUES ('PUR/SU2/0002', pa2_6, '2026-04-19', 52500, 52500, 1312.5, 1312.5, 55125, 55125, 0, 'cash', c2, u_accounts);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM purchases WHERE bill_number = 'PUR/SU2/0003' AND crusher_id = c2) THEN
      INSERT INTO purchases (bill_number, party_id, purchase_date, subtotal, taxable_amount,
                             cgst_amount, sgst_amount, grand_total,
                             amount_paid, balance_due, payment_mode, crusher_id, created_by)
      VALUES ('PUR/SU2/0003', pa2_5, '2026-05-08', 178500, 178500, 4462.5, 4462.5, 187425, 187425, 0, 'cheque', c2, u_accounts);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM purchases WHERE bill_number = 'PUR/SU2/0004' AND crusher_id = c2) THEN
      INSERT INTO purchases (bill_number, party_id, purchase_date, subtotal, taxable_amount,
                             cgst_amount, sgst_amount, grand_total,
                             amount_paid, balance_due, payment_mode, crusher_id, created_by)
      VALUES ('PUR/SU2/0004', pa2_6, '2026-05-23', 63000, 63000, 1575, 1575, 66150, 66150, 0, 'cash', c2, u_accounts);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM purchases WHERE bill_number = 'PUR/SU2/0005' AND crusher_id = c2) THEN
      INSERT INTO purchases (bill_number, party_id, purchase_date, subtotal, taxable_amount,
                             cgst_amount, sgst_amount, grand_total,
                             amount_paid, balance_due, payment_mode, crusher_id, created_by)
      VALUES ('PUR/SU2/0005', pa2_5, '2026-06-06', 139650, 139650, 3491.25, 3491.25, 146632.5, 0, 146632.5, 'cheque', c2, u_accounts);
    END IF;
  END IF;

  -- Quarry sales — Unit 2
  IF pa2_2 IS NOT NULL THEN
    INSERT INTO quarry_sales (invoice_number, party_id, vehicle_id, product_name, quantity, unit,
                              rate, royalty_rate, amount, royalty_amount, grand_total, sale_date, crusher_id, created_by)
    VALUES
      ('QU2/2526/0001', pa2_2, v2_1, 'Blue Metal Rock', 140, 'MT', 185, 55, 25900, 7700,  33600, '2026-04-03', c2, u_sales),
      ('QU2/2526/0002', pa2_3, v2_2, 'Blue Metal Rock', 220, 'MT', 185, 55, 40700, 12100, 52800, '2026-04-14', c2, u_sales),
      ('QU2/2526/0003', pa2_2, v2_3, 'Blue Metal Rock', 175, 'MT', 190, 55, 33250, 9625,  42875, '2026-05-02', c2, u_sales),
      ('QU2/2526/0004', pa2_3, v2_1, 'Earth & Soil',    100, 'MT', 120, 30, 12000, 3000,  15000, '2026-05-18', c2, u_sales),
      ('QU2/2526/0005', pa2_2, v2_2, 'Blue Metal Rock', 200, 'MT', 190, 55, 38000, 11000, 49000, '2026-06-02', c2, u_sales)
    ON CONFLICT (invoice_number) DO NOTHING;
  END IF;

  -- Maintenance — Unit 2 (no unique constraint — use IF NOT EXISTS)
  IF a2_crusher IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM maintenance_records WHERE asset_id = a2_crusher AND title = 'Monthly rotor & bearing inspection' AND scheduled_date = '2026-04-08') THEN
      INSERT INTO maintenance_records (asset_id, asset_type, title, description, scheduled_date, completed_date,
                                       cost, vendor_name, next_service_date, status, crusher_id)
      VALUES (a2_crusher, 'machinery', 'Monthly rotor & bearing inspection', 'VSI rotor and bearing check',
              '2026-04-08', '2026-04-08', 9200, 'VSI Spares Chennai', '2026-05-08', 'completed', c2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM maintenance_records WHERE asset_id = a2_crusher AND title = 'Monthly rotor & bearing inspection' AND scheduled_date = '2026-05-08') THEN
      INSERT INTO maintenance_records (asset_id, asset_type, title, description, scheduled_date, completed_date,
                                       cost, vendor_name, next_service_date, status, crusher_id)
      VALUES (a2_crusher, 'machinery', 'Monthly rotor & bearing inspection', 'VSI rotor and bearing check',
              '2026-05-08', '2026-05-08', 9200, 'VSI Spares Chennai', '2026-06-08', 'completed', c2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM maintenance_records WHERE asset_id = a2_crusher AND title = 'Wear parts replacement' AND scheduled_date = '2026-05-20') THEN
      INSERT INTO maintenance_records (asset_id, asset_type, title, description, scheduled_date, completed_date,
                                       cost, vendor_name, next_service_date, status, crusher_id)
      VALUES (a2_crusher, 'machinery', 'Wear parts replacement', 'Anvils and feed tube replacement',
              '2026-05-20', '2026-05-20', 32000, 'VSI Spares Chennai', '2026-11-20', 'completed', c2);
    END IF;
  END IF;

  -- Attendance — Unit 2
  IF w2_1 IS NOT NULL THEN
    INSERT INTO attendance (worker_id, date, status, crusher_id) VALUES
      (w2_1,'2026-05-05','present',  c2),(w2_1,'2026-05-06','present',  c2),(w2_1,'2026-05-07','present',  c2),
      (w2_1,'2026-05-08','present',  c2),(w2_1,'2026-05-09','absent',   c2),(w2_1,'2026-05-12','present',  c2),
      (w2_2,'2026-05-05','present',  c2),(w2_2,'2026-05-06','present',  c2),(w2_2,'2026-05-07','present',  c2),
      (w2_2,'2026-05-08','present',  c2),(w2_2,'2026-05-09','present',  c2),(w2_2,'2026-05-12','present',  c2),
      (w2_3,'2026-05-05','absent',   c2),(w2_3,'2026-05-06','present',  c2),(w2_3,'2026-05-07','present',  c2),
      (w2_3,'2026-05-08','half_day', c2),(w2_3,'2026-05-09','present',  c2),(w2_3,'2026-05-12','present',  c2),
      (w2_4,'2026-05-05','present',  c2),(w2_4,'2026-05-06','present',  c2),(w2_4,'2026-05-07','present',  c2),
      (w2_4,'2026-05-08','present',  c2),(w2_4,'2026-05-09','leave',    c2),(w2_4,'2026-05-12','present',  c2)
    ON CONFLICT (worker_id, date) DO NOTHING;
  END IF;

  -- Wage payments — Unit 2
  IF w2_1 IS NOT NULL THEN
    INSERT INTO wage_payments (worker_id, period_from, period_to, days_worked, gross_wages,
                               deductions, net_wages, payment_date, payment_mode, crusher_id)
    VALUES
      (w2_1,'2026-04-01','2026-04-30', 26, 17420, 0,   17420, '2026-05-01','cash', c2),
      (w2_2,'2026-04-01','2026-04-30', 26, 19000, 500, 18500, '2026-05-01','upi',  c2),
      (w2_3,'2026-04-01','2026-04-30', 24, 11040, 0,   11040, '2026-05-01','cash', c2),
      (w2_4,'2026-04-01','2026-04-30', 25, 15250, 0,   15250, '2026-05-01','cash', c2),
      (w2_1,'2026-05-01','2026-05-31', 27, 18090, 0,   18090, '2026-06-01','cash', c2),
      (w2_2,'2026-05-01','2026-05-31', 27, 19000, 0,   19000, '2026-06-01','upi',  c2),
      (w2_3,'2026-05-01','2026-05-31', 25, 11500, 0,   11500, '2026-06-01','cash', c2),
      (w2_4,'2026-05-01','2026-05-31', 26, 15860, 0,   15860, '2026-06-01','cash', c2)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Ledger — Unit 2
  IF pa2_1 IS NOT NULL THEN
    INSERT INTO ledger_transactions (txn_type, party_id, amount, narration, txn_date, payment_mode, crusher_id)
    VALUES
      ('receipt', pa2_1,  54810,  'Against SU2/2526/0001',                   '2026-04-07', 'upi',    c2),
      ('receipt', pa2_2,  70560,  'Against SU2/2526/0002',                   '2026-04-12', 'cheque', c2),
      ('receipt', pa2_3,  94080,  'Against SU2/2526/0003',                   '2026-04-18', 'cheque', c2),
      ('receipt', pa2_4,  45675,  'Against SU2/2526/0004',                   '2026-04-25', 'upi',    c2),
      ('receipt', pa2_1,  82320,  'Against SU2/2526/0005',                   '2026-05-09', 'cheque', c2),
      ('receipt', pa2_2,  59535,  'Against SU2/2526/0006',                   '2026-05-16', 'upi',    c2),
      ('receipt', pa2_3, 107520,  'Against SU2/2526/0007',                   '2026-05-22', 'cheque', c2),
      ('receipt', pa2_1,  67032,  'Against SU2/2526/0009',                   '2026-06-06', 'upi',    c2),
      ('payment', pa2_5, 158760,  'Raw material — PUR/SU2/0001',            '2026-04-08', 'cheque', c2),
      ('payment', pa2_6,  55125,  'Transport — PUR/SU2/0002',               '2026-04-20', 'cash',   c2),
      ('payment', pa2_5, 187425,  'Raw material — PUR/SU2/0003',            '2026-05-10', 'cheque', c2),
      ('journal', NULL,   54600,  'TNEB Electricity bill — April 2026',      '2026-04-30', 'cheque', c2),
      ('journal', NULL,   40500,  'Diesel — 375 litres @ Rs.108',            '2026-04-26', 'cash',   c2),
      ('journal', NULL,   58400,  'TNEB Electricity bill — May 2026',        '2026-05-31', 'cheque', c2),
      ('journal', NULL,    9200,  'VSI Crusher maintenance — April',         '2026-04-10', 'cash',   c2),
      ('journal', NULL,    9200,  'VSI Crusher maintenance — May',           '2026-05-10', 'cash',   c2)
    ON CONFLICT DO NOTHING;
  END IF;

END $$;
