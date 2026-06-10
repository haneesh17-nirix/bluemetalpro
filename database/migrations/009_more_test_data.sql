-- =============================================================
-- 009_more_test_data.sql  — Dense two-week demo data (May 27 – Jun 10 2026)
-- Adds:
--   • 4 new users  (all password: Test@1234)
--   • 3 extra vehicles + 2 extra machinery assets per unit
--   • 5 extra workers per unit
--   • Daily sales for every working day in the fortnight
--   • 14 days of attendance for every worker
--   • Maintenance records across the fortnight
--   • Receipts, supplier payments and opex journal entries
-- Idempotent: ON CONFLICT DO NOTHING / IF NOT EXISTS guards throughout.
-- =============================================================

DO $$
DECLARE
  -- Crushers
  c1 UUID;
  c2 UUID;

  -- Existing users
  u_admin    UUID;
  u_sales    UUID;
  u_accounts UUID;

  -- New users
  u_mgr      UUID;
  u_op1      UUID;
  u_op2      UUID;
  u_maint    UUID;

  -- ── Unit 1 existing master data ──────────────────────────────
  p1_msand UUID; p1_psand UUID; p1_20mm UUID; p1_40mm UUID; p1_6mm UUID;
  pa1_1 UUID; pa1_2 UUID; pa1_3 UUID; pa1_4 UUID; pa1_5 UUID; pa1_6 UUID;
  v1_1 UUID; v1_2 UUID; v1_3 UUID; v1_4 UUID;
  -- new vehicles
  v1_5 UUID; v1_6 UUID; v1_7 UUID;
  -- existing workers
  w1_1 UUID; w1_2 UUID; w1_3 UUID; w1_4 UUID; w1_5 UUID;
  -- new workers
  w1_6 UUID; w1_7 UUID; w1_8 UUID; w1_9 UUID; w1_10 UUID;
  -- assets
  a1_crusher UUID;
  a1_screen  UUID;
  a1_gen     UUID;

  -- ── Unit 2 existing master data ──────────────────────────────
  p2_msand UUID; p2_psand UUID; p2_20mm UUID; p2_40mm UUID; p2_dust UUID;
  pa2_1 UUID; pa2_2 UUID; pa2_3 UUID; pa2_4 UUID; pa2_5 UUID; pa2_6 UUID;
  v2_1 UUID; v2_2 UUID; v2_3 UUID;
  -- new vehicles
  v2_4 UUID; v2_5 UUID; v2_6 UUID;
  -- existing workers
  w2_1 UUID; w2_2 UUID; w2_3 UUID; w2_4 UUID;
  -- new workers
  w2_5 UUID; w2_6 UUID; w2_7 UUID; w2_8 UUID; w2_9 UUID;
  -- assets
  a2_crusher UUID;
  a2_screen  UUID;
  a2_pump    UUID;

  -- Temp sale/purchase ID
  s UUID;

BEGIN

  -- ── Resolve crusher IDs ────────────────────────────────────────
  SELECT id INTO c1 FROM crushers WHERE name = 'BlueMetal Quarry Unit 1' LIMIT 1;
  SELECT id INTO c2 FROM crushers WHERE name = 'BlueMetal Quarry Unit 2' LIMIT 1;

  -- ── Resolve existing user IDs ──────────────────────────────────
  SELECT id INTO u_admin    FROM users WHERE email = 'admin@bluemetal.local'    LIMIT 1;
  SELECT id INTO u_sales    FROM users WHERE email = 'sales@bluemetal.local'    LIMIT 1;
  SELECT id INTO u_accounts FROM users WHERE email = 'accounts@bluemetal.local' LIMIT 1;

  -- ────────────────────────────────────────────────────────────────
  -- NEW USERS  (password = Test@1234)
  -- bcrypt hash: $2a$10$uExSDVxMC/KADd3jiPZTz.SgF7qUlrOX0MNPrK5g6Qisma2T3QgZy
  -- ────────────────────────────────────────────────────────────────
  INSERT INTO users (name, email, password_hash, role, is_active) VALUES
    ('Rajesh Kumar',    'manager@bluemetal.local',    '$2a$10$uExSDVxMC/KADd3jiPZTz.SgF7qUlrOX0MNPrK5g6Qisma2T3QgZy', 'report_viewer',   true),
    ('Senthil Murugan', 'operator1@bluemetal.local',  '$2a$10$uExSDVxMC/KADd3jiPZTz.SgF7qUlrOX0MNPrK5g6Qisma2T3QgZy', 'sales_operator',  true),
    ('Kavitha Devi',    'operator2@bluemetal.local',  '$2a$10$uExSDVxMC/KADd3jiPZTz.SgF7qUlrOX0MNPrK5g6Qisma2T3QgZy', 'quarry_operator', true),
    ('Prakash Raj',     'maintenance@bluemetal.local','$2a$10$uExSDVxMC/KADd3jiPZTz.SgF7qUlrOX0MNPrK5g6Qisma2T3QgZy', 'vehicle_manager', true)
  ON CONFLICT (email) DO NOTHING;

  SELECT id INTO u_mgr   FROM users WHERE email = 'manager@bluemetal.local'     LIMIT 1;
  SELECT id INTO u_op1   FROM users WHERE email = 'operator1@bluemetal.local'   LIMIT 1;
  SELECT id INTO u_op2   FROM users WHERE email = 'operator2@bluemetal.local'   LIMIT 1;
  SELECT id INTO u_maint FROM users WHERE email = 'maintenance@bluemetal.local' LIMIT 1;

  -- Grant new users access to both crushers
  IF c1 IS NOT NULL AND c2 IS NOT NULL THEN
    INSERT INTO user_crusher_access (user_id, crusher_id, role) VALUES
      (u_mgr,   c1, 'report_viewer'),   (u_mgr,   c2, 'report_viewer'),
      (u_op1,   c1, 'sales_operator'),  (u_op1,   c2, 'sales_operator'),
      (u_op2,   c1, 'quarry_operator'), (u_op2,   c2, 'quarry_operator'),
      (u_maint, c1, 'vehicle_manager'), (u_maint, c2, 'vehicle_manager')
    ON CONFLICT (user_id, crusher_id) DO NOTHING;
  END IF;

  IF c1 IS NULL OR c2 IS NULL THEN
    RAISE NOTICE '009: crusher IDs not found — skipping data seed';
    RETURN;
  END IF;

  -- ── Resolve Unit-1 existing master data ────────────────────────
  SELECT id INTO p1_msand FROM products WHERE name = 'M-Sand'          AND crusher_id = c1 LIMIT 1;
  SELECT id INTO p1_psand FROM products WHERE name = 'P-Sand'          AND crusher_id = c1 LIMIT 1;
  SELECT id INTO p1_20mm  FROM products WHERE name = '20mm Blue Metal' AND crusher_id = c1 LIMIT 1;
  SELECT id INTO p1_40mm  FROM products WHERE name = '40mm Blue Metal' AND crusher_id = c1 LIMIT 1;
  SELECT id INTO p1_6mm   FROM products WHERE name = '6mm Chips'       AND crusher_id = c1 LIMIT 1;

  SELECT id INTO pa1_1 FROM parties WHERE name = 'Ramaiah Constructions'  AND crusher_id = c1 LIMIT 1;
  SELECT id INTO pa1_2 FROM parties WHERE name = 'GKK Builders Pvt Ltd'  AND crusher_id = c1 LIMIT 1;
  SELECT id INTO pa1_3 FROM parties WHERE name = 'Suresh Road Works'      AND crusher_id = c1 LIMIT 1;
  SELECT id INTO pa1_4 FROM parties WHERE name = 'National Highways Dept' AND crusher_id = c1 LIMIT 1;
  SELECT id INTO pa1_5 FROM parties WHERE name = 'Ponni Granites'         AND crusher_id = c1 LIMIT 1;
  SELECT id INTO pa1_6 FROM parties WHERE name = 'Karthik Transport Co'   AND crusher_id = c1 LIMIT 1;

  SELECT id INTO v1_1 FROM vehicles WHERE registration_number = 'TN33 AC 1234' LIMIT 1;
  SELECT id INTO v1_2 FROM vehicles WHERE registration_number = 'TN33 AC 5678' LIMIT 1;
  SELECT id INTO v1_3 FROM vehicles WHERE registration_number = 'KA01 BX 9012' LIMIT 1;
  SELECT id INTO v1_4 FROM vehicles WHERE registration_number = 'TN33 AD 3456' LIMIT 1;

  SELECT id INTO w1_1 FROM workers WHERE name = 'Arumugam K'    AND crusher_id = c1 LIMIT 1;
  SELECT id INTO w1_2 FROM workers WHERE name = 'Balamurugan R' AND crusher_id = c1 LIMIT 1;
  SELECT id INTO w1_3 FROM workers WHERE name = 'Chinnaswamy P' AND crusher_id = c1 LIMIT 1;
  SELECT id INTO w1_4 FROM workers WHERE name = 'Dhivya S'      AND crusher_id = c1 LIMIT 1;
  SELECT id INTO w1_5 FROM workers WHERE name = 'Eswaran M'     AND crusher_id = c1 LIMIT 1;

  SELECT id INTO a1_crusher FROM assets WHERE name = 'Jaw Crusher 30x24' AND crusher_id = c1 LIMIT 1;

  -- ── Resolve Unit-2 existing master data ────────────────────────
  SELECT id INTO p2_msand FROM products WHERE name = 'M-Sand'          AND crusher_id = c2 LIMIT 1;
  SELECT id INTO p2_psand FROM products WHERE name = 'P-Sand'          AND crusher_id = c2 LIMIT 1;
  SELECT id INTO p2_20mm  FROM products WHERE name = '20mm Blue Metal' AND crusher_id = c2 LIMIT 1;
  SELECT id INTO p2_40mm  FROM products WHERE name = '40mm Blue Metal' AND crusher_id = c2 LIMIT 1;
  SELECT id INTO p2_dust  FROM products WHERE name = 'Quarry Dust'     AND crusher_id = c2 LIMIT 1;

  SELECT id INTO pa2_1 FROM parties WHERE name = 'Salem Steel Constructions' AND crusher_id = c2 LIMIT 1;
  SELECT id INTO pa2_2 FROM parties WHERE name = 'Erode Roads Pvt Ltd'       AND crusher_id = c2 LIMIT 1;
  SELECT id INTO pa2_3 FROM parties WHERE name = 'TNHB Salem Division'       AND crusher_id = c2 LIMIT 1;
  SELECT id INTO pa2_4 FROM parties WHERE name = 'Coimbatore Infra Corp'     AND crusher_id = c2 LIMIT 1;
  SELECT id INTO pa2_5 FROM parties WHERE name = 'Selvam Rock Quarry'        AND crusher_id = c2 LIMIT 1;
  SELECT id INTO pa2_6 FROM parties WHERE name = 'Sri Murugan Transport'     AND crusher_id = c2 LIMIT 1;

  SELECT id INTO v2_1 FROM vehicles WHERE registration_number = 'TN30 AK 4455' LIMIT 1;
  SELECT id INTO v2_2 FROM vehicles WHERE registration_number = 'TN30 AK 6677' LIMIT 1;
  SELECT id INTO v2_3 FROM vehicles WHERE registration_number = 'TN30 BL 8899' LIMIT 1;

  SELECT id INTO w2_1 FROM workers WHERE name = 'Govindasamy T' AND crusher_id = c2 LIMIT 1;
  SELECT id INTO w2_2 FROM workers WHERE name = 'Hariharan S'   AND crusher_id = c2 LIMIT 1;
  SELECT id INTO w2_3 FROM workers WHERE name = 'Ilayaraja P'   AND crusher_id = c2 LIMIT 1;
  SELECT id INTO w2_4 FROM workers WHERE name = 'Jeyaraman K'   AND crusher_id = c2 LIMIT 1;

  SELECT id INTO a2_crusher FROM assets WHERE name = 'VSI Crusher Salem' AND crusher_id = c2 LIMIT 1;

  -- ==============================================================
  -- UNIT 1 — NEW VEHICLES
  -- ==============================================================
  INSERT INTO vehicles (registration_number, owner_name, vehicle_type, capacity_mt, status, crusher_id) VALUES
    ('TN33 AE 7890', 'Sugumar',    'Tipper',   12, 'active',      c1),
    ('TN33 AF 2345', 'Velmurugan', 'Tipper',   10, 'active',      c1),
    ('TN33 AG 6789', 'Kannan',     'Tractor',   6, 'maintenance', c1)
  ON CONFLICT (registration_number) DO NOTHING;
  SELECT id INTO v1_5 FROM vehicles WHERE registration_number = 'TN33 AE 7890' LIMIT 1;
  SELECT id INTO v1_6 FROM vehicles WHERE registration_number = 'TN33 AF 2345' LIMIT 1;
  SELECT id INTO v1_7 FROM vehicles WHERE registration_number = 'TN33 AG 6789' LIMIT 1;

  -- ==============================================================
  -- UNIT 1 — NEW MACHINERY ASSETS
  -- ==============================================================
  IF NOT EXISTS (SELECT 1 FROM assets WHERE name = 'Vibrating Screen 4x8' AND crusher_id = c1) THEN
    INSERT INTO assets (name, asset_type, serial_number, purchase_date, purchase_cost, crusher_id)
    VALUES ('Vibrating Screen 4x8', 'machinery', 'VS-4X8-2023', '2023-08-10', 980000, c1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM assets WHERE name = 'DG Set 125 KVA' AND crusher_id = c1) THEN
    INSERT INTO assets (name, asset_type, serial_number, purchase_date, purchase_cost, crusher_id)
    VALUES ('DG Set 125 KVA', 'machinery', 'DG-125-2022', '2022-11-05', 650000, c1);
  END IF;
  SELECT id INTO a1_screen FROM assets WHERE name = 'Vibrating Screen 4x8' AND crusher_id = c1 LIMIT 1;
  SELECT id INTO a1_gen    FROM assets WHERE name = 'DG Set 125 KVA'       AND crusher_id = c1 LIMIT 1;

  -- ==============================================================
  -- UNIT 1 — NEW WORKERS
  -- ==============================================================
  IF NOT EXISTS (SELECT 1 FROM workers WHERE name = 'Murugesan V'    AND crusher_id = c1) THEN
    INSERT INTO workers (name, phone, designation, wage_type, wage_rate, joining_date, crusher_id)
    VALUES ('Murugesan V', '9876501006', 'Screen Operator', 'daily', 580, '2024-06-01', c1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM workers WHERE name = 'Nallathambi K'  AND crusher_id = c1) THEN
    INSERT INTO workers (name, phone, designation, wage_type, wage_rate, joining_date, crusher_id)
    VALUES ('Nallathambi K', '9876501007', 'Loader Operator', 'daily', 620, '2023-10-15', c1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM workers WHERE name = 'Oviya M'        AND crusher_id = c1) THEN
    INSERT INTO workers (name, phone, designation, wage_type, wage_rate, joining_date, crusher_id)
    VALUES ('Oviya M', '9876501008', 'Gate Clerk', 'monthly', 13000, '2025-01-10', c1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM workers WHERE name = 'Palaniappan S'  AND crusher_id = c1) THEN
    INSERT INTO workers (name, phone, designation, wage_type, wage_rate, joining_date, crusher_id)
    VALUES ('Palaniappan S', '9876501009', 'Security Guard', 'monthly', 11000, '2023-06-20', c1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM workers WHERE name = 'Ramasamy G'     AND crusher_id = c1) THEN
    INSERT INTO workers (name, phone, designation, wage_type, wage_rate, joining_date, crusher_id)
    VALUES ('Ramasamy G', '9876501010', 'Helper', 'daily', 450, '2025-03-01', c1);
  END IF;
  SELECT id INTO w1_6  FROM workers WHERE name = 'Murugesan V'   AND crusher_id = c1 LIMIT 1;
  SELECT id INTO w1_7  FROM workers WHERE name = 'Nallathambi K' AND crusher_id = c1 LIMIT 1;
  SELECT id INTO w1_8  FROM workers WHERE name = 'Oviya M'       AND crusher_id = c1 LIMIT 1;
  SELECT id INTO w1_9  FROM workers WHERE name = 'Palaniappan S' AND crusher_id = c1 LIMIT 1;
  SELECT id INTO w1_10 FROM workers WHERE name = 'Ramasamy G'    AND crusher_id = c1 LIMIT 1;

  -- ==============================================================
  -- UNIT 1 — SALES  (May 27 – Jun 10, every working day)
  -- ==============================================================
  IF pa1_1 IS NOT NULL AND p1_msand IS NOT NULL THEN
    INSERT INTO sales (invoice_number, party_id, sale_date,
                       subtotal, taxable_amount, cgst_amount, sgst_amount, total_tax, grand_total,
                       amount_received, balance_due, payment_mode, status,
                       vehicle_id, crusher_id, created_by)
    VALUES
      -- Week 1: May 27–31
      ('HU1/2526/0016', pa1_1,'2026-05-27', 46750, 46750, 1168.75, 1168.75, 2337.5,  49087.5,  49087.5, 0,       'upi',   'confirmed', v1_1, c1, u_op1),
      ('HU1/2526/0017', pa1_2,'2026-05-27', 72600, 72600, 1815,    1815,    3630,    76230,    76230,   0,       'cheque','confirmed', v1_2, c1, u_op1),
      ('HU1/2526/0018', pa1_3,'2026-05-28', 38250, 38250, 956.25,  956.25,  1912.5,  40162.5,  40162.5, 0,       'cash',  'confirmed', v1_5, c1, u_sales),
      ('HU1/2526/0019', pa1_4,'2026-05-28', 99000, 99000, 2475,    2475,    4950,    103950,   0,       103950,  'credit','confirmed', v1_3, c1, u_sales),
      ('HU1/2526/0020', pa1_1,'2026-05-29', 55250, 55250, 1381.25, 1381.25, 2762.5,  58012.5,  58012.5, 0,       'upi',   'confirmed', v1_6, c1, u_op1),
      ('HU1/2526/0021', pa1_2,'2026-05-29', 43560, 43560, 1089,    1089,    2178,    45738,    45738,   0,       'cash',  'confirmed', v1_1, c1, u_op1),
      ('HU1/2526/0022', pa1_3,'2026-05-30', 67200, 67200, 1680,    1680,    3360,    70560,    70560,   0,       'upi',   'confirmed', v1_2, c1, u_sales),
      ('HU1/2526/0023', pa1_4,'2026-05-30', 88000, 88000, 2200,    2200,    4400,    92400,    92400,   0,       'cheque','confirmed', v1_5, c1, u_sales),
      -- Week 2: Jun 2–6
      ('HU1/2526/0024', pa1_1,'2026-06-02', 42500, 42500, 1062.5,  1062.5,  2125,    44625,    44625,   0,       'cash',  'confirmed', v1_6, c1, u_op1),
      ('HU1/2526/0025', pa1_2,'2026-06-02', 58300, 58300, 1457.5,  1457.5,  2915,    61215,    61215,   0,       'upi',   'confirmed', v1_3, c1, u_op1),
      ('HU1/2526/0026', pa1_3,'2026-06-03', 76000, 76000, 1900,    1900,    3800,    79800,    79800,   0,       'cheque','confirmed', v1_1, c1, u_sales),
      ('HU1/2526/0027', pa1_4,'2026-06-03', 82500, 82500, 2062.5,  2062.5,  4125,    86625,    86625,   0,       'cheque','confirmed', v1_2, c1, u_sales),
      ('HU1/2526/0028', pa1_1,'2026-06-04', 51000, 51000, 1275,    1275,    2550,    53550,    53550,   0,       'upi',   'confirmed', v1_5, c1, u_op1),
      ('HU1/2526/0029', pa1_2,'2026-06-05', 63800, 63800, 1595,    1595,    3190,    66990,    66990,   0,       'cash',  'confirmed', v1_6, c1, u_op1),
      ('HU1/2526/0030', pa1_3,'2026-06-05', 47600, 47600, 1190,    1190,    2380,    49980,    49980,   0,       'upi',   'confirmed', v1_1, c1, u_sales),
      ('HU1/2526/0031', pa1_4,'2026-06-06', 110000,110000,2750,    2750,    5500,    115500,   115500,  0,       'cheque','confirmed', v1_3, c1, u_sales),
      -- Jun 9–10
      ('HU1/2526/0032', pa1_1,'2026-06-09', 57800, 57800, 1445,    1445,    2890,    60690,    60690,   0,       'upi',   'confirmed', v1_2, c1, u_op1),
      ('HU1/2526/0033', pa1_2,'2026-06-09', 44000, 44000, 1100,    1100,    2200,    46200,    46200,   0,       'cash',  'confirmed', v1_5, c1, u_op1),
      ('HU1/2526/0034', pa1_3,'2026-06-10', 69300, 69300, 1732.5,  1732.5,  3465,    72765,    72765,   0,       'upi',   'confirmed', v1_6, c1, u_sales),
      ('HU1/2526/0035', pa1_4,'2026-06-10', 93500, 93500, 2337.5,  2337.5,  4675,    98175,    0,       98175,   'credit','confirmed', v1_1, c1, u_sales)
    ON CONFLICT (invoice_number) DO NOTHING;

    -- Sale items for each new invoice
    SELECT id INTO s FROM sales WHERE crusher_id=c1 AND invoice_number='HU1/2526/0016' LIMIT 1;
    IF s IS NOT NULL AND NOT EXISTS(SELECT 1 FROM sale_items WHERE sale_id=s) THEN
      INSERT INTO sale_items(sale_id,product_id,product_name,hsn_code,unit,quantity,rate,amount,gst_rate,cgst_rate,sgst_rate,cgst_amount,sgst_amount,total_amount)
      VALUES(s,p1_msand,'M-Sand','25171010','MT',55,850,46750,5,2.5,2.5,1168.75,1168.75,49087.5);
    END IF;
    SELECT id INTO s FROM sales WHERE crusher_id=c1 AND invoice_number='HU1/2526/0017' LIMIT 1;
    IF s IS NOT NULL AND NOT EXISTS(SELECT 1 FROM sale_items WHERE sale_id=s) THEN
      INSERT INTO sale_items(sale_id,product_id,product_name,hsn_code,unit,quantity,rate,amount,gst_rate,cgst_rate,sgst_rate,cgst_amount,sgst_amount,total_amount)
      VALUES(s,p1_20mm,'20mm Blue Metal','25171010','MT',66,1100,72600,5,2.5,2.5,1815,1815,76230);
    END IF;
    SELECT id INTO s FROM sales WHERE crusher_id=c1 AND invoice_number='HU1/2526/0018' LIMIT 1;
    IF s IS NOT NULL AND NOT EXISTS(SELECT 1 FROM sale_items WHERE sale_id=s) THEN
      INSERT INTO sale_items(sale_id,product_id,product_name,hsn_code,unit,quantity,rate,amount,gst_rate,cgst_rate,sgst_rate,cgst_amount,sgst_amount,total_amount)
      VALUES(s,p1_psand,'P-Sand','25171010','MT',40.26,950,38247,5,2.5,2.5,956.175,956.175,40159.35);
    END IF;
    SELECT id INTO s FROM sales WHERE crusher_id=c1 AND invoice_number='HU1/2526/0019' LIMIT 1;
    IF s IS NOT NULL AND NOT EXISTS(SELECT 1 FROM sale_items WHERE sale_id=s) THEN
      INSERT INTO sale_items(sale_id,product_id,product_name,hsn_code,unit,quantity,rate,amount,gst_rate,cgst_rate,sgst_rate,cgst_amount,sgst_amount,total_amount)
      VALUES(s,p1_40mm,'40mm Blue Metal','25171010','MT',101.02,980,99000,5,2.5,2.5,2475,2475,103950);
    END IF;
    SELECT id INTO s FROM sales WHERE crusher_id=c1 AND invoice_number='HU1/2526/0020' LIMIT 1;
    IF s IS NOT NULL AND NOT EXISTS(SELECT 1 FROM sale_items WHERE sale_id=s) THEN
      INSERT INTO sale_items(sale_id,product_id,product_name,hsn_code,unit,quantity,rate,amount,gst_rate,cgst_rate,sgst_rate,cgst_amount,sgst_amount,total_amount)
      VALUES(s,p1_msand,'M-Sand','25171010','MT',65,850,55250,5,2.5,2.5,1381.25,1381.25,58012.5);
    END IF;
    SELECT id INTO s FROM sales WHERE crusher_id=c1 AND invoice_number='HU1/2526/0021' LIMIT 1;
    IF s IS NOT NULL AND NOT EXISTS(SELECT 1 FROM sale_items WHERE sale_id=s) THEN
      INSERT INTO sale_items(sale_id,product_id,product_name,hsn_code,unit,quantity,rate,amount,gst_rate,cgst_rate,sgst_rate,cgst_amount,sgst_amount,total_amount)
      VALUES(s,p1_6mm,'6mm Chips','25171010','MT',58.08,750,43560,5,2.5,2.5,1089,1089,45738);
    END IF;
    SELECT id INTO s FROM sales WHERE crusher_id=c1 AND invoice_number='HU1/2526/0022' LIMIT 1;
    IF s IS NOT NULL AND NOT EXISTS(SELECT 1 FROM sale_items WHERE sale_id=s) THEN
      INSERT INTO sale_items(sale_id,product_id,product_name,hsn_code,unit,quantity,rate,amount,gst_rate,cgst_rate,sgst_rate,cgst_amount,sgst_amount,total_amount)
      VALUES(s,p1_psand,'P-Sand','25171010','MT',70.74,950,67203,5,2.5,2.5,1680.075,1680.075,70563.15);
    END IF;
    SELECT id INTO s FROM sales WHERE crusher_id=c1 AND invoice_number='HU1/2526/0023' LIMIT 1;
    IF s IS NOT NULL AND NOT EXISTS(SELECT 1 FROM sale_items WHERE sale_id=s) THEN
      INSERT INTO sale_items(sale_id,product_id,product_name,hsn_code,unit,quantity,rate,amount,gst_rate,cgst_rate,sgst_rate,cgst_amount,sgst_amount,total_amount)
      VALUES(s,p1_40mm,'40mm Blue Metal','25171010','MT',89.8,980,88004,5,2.5,2.5,2200.1,2200.1,92404.2);
    END IF;
    SELECT id INTO s FROM sales WHERE crusher_id=c1 AND invoice_number='HU1/2526/0024' LIMIT 1;
    IF s IS NOT NULL AND NOT EXISTS(SELECT 1 FROM sale_items WHERE sale_id=s) THEN
      INSERT INTO sale_items(sale_id,product_id,product_name,hsn_code,unit,quantity,rate,amount,gst_rate,cgst_rate,sgst_rate,cgst_amount,sgst_amount,total_amount)
      VALUES(s,p1_msand,'M-Sand','25171010','MT',50,850,42500,5,2.5,2.5,1062.5,1062.5,44625);
    END IF;
    SELECT id INTO s FROM sales WHERE crusher_id=c1 AND invoice_number='HU1/2526/0025' LIMIT 1;
    IF s IS NOT NULL AND NOT EXISTS(SELECT 1 FROM sale_items WHERE sale_id=s) THEN
      INSERT INTO sale_items(sale_id,product_id,product_name,hsn_code,unit,quantity,rate,amount,gst_rate,cgst_rate,sgst_rate,cgst_amount,sgst_amount,total_amount)
      VALUES(s,p1_20mm,'20mm Blue Metal','25171010','MT',53,1100,58300,5,2.5,2.5,1457.5,1457.5,61215);
    END IF;
    SELECT id INTO s FROM sales WHERE crusher_id=c1 AND invoice_number='HU1/2526/0026' LIMIT 1;
    IF s IS NOT NULL AND NOT EXISTS(SELECT 1 FROM sale_items WHERE sale_id=s) THEN
      INSERT INTO sale_items(sale_id,product_id,product_name,hsn_code,unit,quantity,rate,amount,gst_rate,cgst_rate,sgst_rate,cgst_amount,sgst_amount,total_amount)
      VALUES(s,p1_psand,'P-Sand','25171010','MT',80,950,76000,5,2.5,2.5,1900,1900,79800);
    END IF;
    SELECT id INTO s FROM sales WHERE crusher_id=c1 AND invoice_number='HU1/2526/0027' LIMIT 1;
    IF s IS NOT NULL AND NOT EXISTS(SELECT 1 FROM sale_items WHERE sale_id=s) THEN
      INSERT INTO sale_items(sale_id,product_id,product_name,hsn_code,unit,quantity,rate,amount,gst_rate,cgst_rate,sgst_rate,cgst_amount,sgst_amount,total_amount)
      VALUES(s,p1_40mm,'40mm Blue Metal','25171010','MT',84.18,980,82496.4,5,2.5,2.5,2062.41,2062.41,86621.22);
    END IF;
    SELECT id INTO s FROM sales WHERE crusher_id=c1 AND invoice_number='HU1/2526/0028' LIMIT 1;
    IF s IS NOT NULL AND NOT EXISTS(SELECT 1 FROM sale_items WHERE sale_id=s) THEN
      INSERT INTO sale_items(sale_id,product_id,product_name,hsn_code,unit,quantity,rate,amount,gst_rate,cgst_rate,sgst_rate,cgst_amount,sgst_amount,total_amount)
      VALUES(s,p1_msand,'M-Sand','25171010','MT',60,850,51000,5,2.5,2.5,1275,1275,53550);
    END IF;
    SELECT id INTO s FROM sales WHERE crusher_id=c1 AND invoice_number='HU1/2526/0029' LIMIT 1;
    IF s IS NOT NULL AND NOT EXISTS(SELECT 1 FROM sale_items WHERE sale_id=s) THEN
      INSERT INTO sale_items(sale_id,product_id,product_name,hsn_code,unit,quantity,rate,amount,gst_rate,cgst_rate,sgst_rate,cgst_amount,sgst_amount,total_amount)
      VALUES(s,p1_20mm,'20mm Blue Metal','25171010','MT',58,1100,63800,5,2.5,2.5,1595,1595,66990);
    END IF;
    SELECT id INTO s FROM sales WHERE crusher_id=c1 AND invoice_number='HU1/2526/0030' LIMIT 1;
    IF s IS NOT NULL AND NOT EXISTS(SELECT 1 FROM sale_items WHERE sale_id=s) THEN
      INSERT INTO sale_items(sale_id,product_id,product_name,hsn_code,unit,quantity,rate,amount,gst_rate,cgst_rate,sgst_rate,cgst_amount,sgst_amount,total_amount)
      VALUES(s,p1_6mm,'6mm Chips','25171010','MT',63.47,750,47602.5,5,2.5,2.5,1190.0625,1190.0625,49982.625);
    END IF;
    SELECT id INTO s FROM sales WHERE crusher_id=c1 AND invoice_number='HU1/2526/0031' LIMIT 1;
    IF s IS NOT NULL AND NOT EXISTS(SELECT 1 FROM sale_items WHERE sale_id=s) THEN
      INSERT INTO sale_items(sale_id,product_id,product_name,hsn_code,unit,quantity,rate,amount,gst_rate,cgst_rate,sgst_rate,cgst_amount,sgst_amount,total_amount)
      VALUES(s,p1_40mm,'40mm Blue Metal','25171010','MT',112.24,980,109995.2,5,2.5,2.5,2749.88,2749.88,115494.96);
    END IF;
    SELECT id INTO s FROM sales WHERE crusher_id=c1 AND invoice_number='HU1/2526/0032' LIMIT 1;
    IF s IS NOT NULL AND NOT EXISTS(SELECT 1 FROM sale_items WHERE sale_id=s) THEN
      INSERT INTO sale_items(sale_id,product_id,product_name,hsn_code,unit,quantity,rate,amount,gst_rate,cgst_rate,sgst_rate,cgst_amount,sgst_amount,total_amount)
      VALUES(s,p1_msand,'M-Sand','25171010','MT',68,850,57800,5,2.5,2.5,1445,1445,60690);
    END IF;
    SELECT id INTO s FROM sales WHERE crusher_id=c1 AND invoice_number='HU1/2526/0033' LIMIT 1;
    IF s IS NOT NULL AND NOT EXISTS(SELECT 1 FROM sale_items WHERE sale_id=s) THEN
      INSERT INTO sale_items(sale_id,product_id,product_name,hsn_code,unit,quantity,rate,amount,gst_rate,cgst_rate,sgst_rate,cgst_amount,sgst_amount,total_amount)
      VALUES(s,p1_psand,'P-Sand','25171010','MT',46.32,950,44004,5,2.5,2.5,1100.1,1100.1,46204.2);
    END IF;
    SELECT id INTO s FROM sales WHERE crusher_id=c1 AND invoice_number='HU1/2526/0034' LIMIT 1;
    IF s IS NOT NULL AND NOT EXISTS(SELECT 1 FROM sale_items WHERE sale_id=s) THEN
      INSERT INTO sale_items(sale_id,product_id,product_name,hsn_code,unit,quantity,rate,amount,gst_rate,cgst_rate,sgst_rate,cgst_amount,sgst_amount,total_amount)
      VALUES(s,p1_20mm,'20mm Blue Metal','25171010','MT',63,1100,69300,5,2.5,2.5,1732.5,1732.5,72765);
    END IF;
    SELECT id INTO s FROM sales WHERE crusher_id=c1 AND invoice_number='HU1/2526/0035' LIMIT 1;
    IF s IS NOT NULL AND NOT EXISTS(SELECT 1 FROM sale_items WHERE sale_id=s) THEN
      INSERT INTO sale_items(sale_id,product_id,product_name,hsn_code,unit,quantity,rate,amount,gst_rate,cgst_rate,sgst_rate,cgst_amount,sgst_amount,total_amount)
      VALUES(s,p1_40mm,'40mm Blue Metal','25171010','MT',95.41,980,93501.8,5,2.5,2.5,2337.545,2337.545,98176.89);
    END IF;
  END IF;

  -- ==============================================================
  -- UNIT 1 — PURCHASES (fortnight)
  -- ==============================================================
  IF pa1_5 IS NOT NULL THEN
    IF NOT EXISTS(SELECT 1 FROM purchases WHERE bill_number='PUR/HU1/0007' AND crusher_id=c1) THEN
      INSERT INTO purchases(bill_number,party_id,purchase_date,subtotal,taxable_amount,cgst_amount,sgst_amount,grand_total,amount_paid,balance_due,payment_mode,crusher_id,created_by)
      VALUES('PUR/HU1/0007',pa1_5,'2026-05-28',168000,168000,4200,4200,176400,176400,0,'cheque',c1,u_accounts);
    END IF;
    IF NOT EXISTS(SELECT 1 FROM purchases WHERE bill_number='PUR/HU1/0008' AND crusher_id=c1) THEN
      INSERT INTO purchases(bill_number,party_id,purchase_date,subtotal,taxable_amount,cgst_amount,sgst_amount,grand_total,amount_paid,balance_due,payment_mode,crusher_id,created_by)
      VALUES('PUR/HU1/0008',pa1_6,'2026-06-03',63000,63000,1575,1575,66150,66150,0,'cash',c1,u_accounts);
    END IF;
    IF NOT EXISTS(SELECT 1 FROM purchases WHERE bill_number='PUR/HU1/0009' AND crusher_id=c1) THEN
      INSERT INTO purchases(bill_number,party_id,purchase_date,subtotal,taxable_amount,cgst_amount,sgst_amount,grand_total,amount_paid,balance_due,payment_mode,crusher_id,created_by)
      VALUES('PUR/HU1/0009',pa1_5,'2026-06-09',210000,210000,5250,5250,220500,0,220500,'cheque',c1,u_accounts);
    END IF;

    SELECT id INTO s FROM purchases WHERE crusher_id=c1 AND bill_number='PUR/HU1/0007' LIMIT 1;
    IF s IS NOT NULL AND NOT EXISTS(SELECT 1 FROM purchase_items WHERE purchase_id=s) THEN
      INSERT INTO purchase_items(purchase_id,product_id,product_name,unit,quantity,rate,amount,gst_rate,cgst_amount,sgst_amount,total_amount)
      VALUES(s,p1_msand,'M-Sand','MT',400,420,168000,5,4200,4200,176400);
    END IF;
    SELECT id INTO s FROM purchases WHERE crusher_id=c1 AND bill_number='PUR/HU1/0009' LIMIT 1;
    IF s IS NOT NULL AND NOT EXISTS(SELECT 1 FROM purchase_items WHERE purchase_id=s) THEN
      INSERT INTO purchase_items(purchase_id,product_id,product_name,unit,quantity,rate,amount,gst_rate,cgst_amount,sgst_amount,total_amount)
      VALUES(s,p1_20mm,'20mm Blue Metal','MT',396.23,530,210002.9,5,5250.07,5250.07,220503.04);
    END IF;
  END IF;

  -- ==============================================================
  -- UNIT 1 — ATTENDANCE (May 27 – Jun 10, all workers)
  -- ==============================================================
  IF w1_1 IS NOT NULL THEN
    INSERT INTO attendance (worker_id, date, status, crusher_id) VALUES
      -- w1_1 Arumugam
      (w1_1,'2026-05-27','present',c1),(w1_1,'2026-05-28','present',c1),(w1_1,'2026-05-29','present',c1),
      (w1_1,'2026-05-30','present',c1),(w1_1,'2026-06-02','present',c1),(w1_1,'2026-06-03','absent',c1),
      (w1_1,'2026-06-04','present',c1),(w1_1,'2026-06-05','present',c1),(w1_1,'2026-06-06','present',c1),
      (w1_1,'2026-06-09','present',c1),(w1_1,'2026-06-10','present',c1),
      -- w1_2 Balamurugan
      (w1_2,'2026-05-27','present',c1),(w1_2,'2026-05-28','present',c1),(w1_2,'2026-05-29','present',c1),
      (w1_2,'2026-05-30','present',c1),(w1_2,'2026-06-02','present',c1),(w1_2,'2026-06-03','present',c1),
      (w1_2,'2026-06-04','present',c1),(w1_2,'2026-06-05','present',c1),(w1_2,'2026-06-06','present',c1),
      (w1_2,'2026-06-09','present',c1),(w1_2,'2026-06-10','present',c1),
      -- w1_3 Chinnaswamy
      (w1_3,'2026-05-27','present',c1),(w1_3,'2026-05-28','absent',c1),(w1_3,'2026-05-29','present',c1),
      (w1_3,'2026-05-30','half_day',c1),(w1_3,'2026-06-02','present',c1),(w1_3,'2026-06-03','present',c1),
      (w1_3,'2026-06-04','absent',c1),(w1_3,'2026-06-05','present',c1),(w1_3,'2026-06-06','present',c1),
      (w1_3,'2026-06-09','present',c1),(w1_3,'2026-06-10','present',c1),
      -- w1_4 Dhivya
      (w1_4,'2026-05-27','present',c1),(w1_4,'2026-05-28','present',c1),(w1_4,'2026-05-29','present',c1),
      (w1_4,'2026-05-30','present',c1),(w1_4,'2026-06-02','leave',c1),(w1_4,'2026-06-03','present',c1),
      (w1_4,'2026-06-04','present',c1),(w1_4,'2026-06-05','present',c1),(w1_4,'2026-06-06','present',c1),
      (w1_4,'2026-06-09','present',c1),(w1_4,'2026-06-10','present',c1),
      -- w1_5 Eswaran
      (w1_5,'2026-05-27','present',c1),(w1_5,'2026-05-28','present',c1),(w1_5,'2026-05-29','absent',c1),
      (w1_5,'2026-05-30','present',c1),(w1_5,'2026-06-02','present',c1),(w1_5,'2026-06-03','present',c1),
      (w1_5,'2026-06-04','present',c1),(w1_5,'2026-06-05','half_day',c1),(w1_5,'2026-06-06','present',c1),
      (w1_5,'2026-06-09','present',c1),(w1_5,'2026-06-10','present',c1)
    ON CONFLICT (worker_id, date) DO NOTHING;
  END IF;

  IF w1_6 IS NOT NULL THEN
    INSERT INTO attendance (worker_id, date, status, crusher_id) VALUES
      (w1_6,'2026-05-27','present',c1),(w1_6,'2026-05-28','present',c1),(w1_6,'2026-05-29','present',c1),
      (w1_6,'2026-05-30','absent',c1),(w1_6,'2026-06-02','present',c1),(w1_6,'2026-06-03','present',c1),
      (w1_6,'2026-06-04','present',c1),(w1_6,'2026-06-05','present',c1),(w1_6,'2026-06-06','present',c1),
      (w1_6,'2026-06-09','half_day',c1),(w1_6,'2026-06-10','present',c1),
      (w1_7,'2026-05-27','present',c1),(w1_7,'2026-05-28','present',c1),(w1_7,'2026-05-29','present',c1),
      (w1_7,'2026-05-30','present',c1),(w1_7,'2026-06-02','present',c1),(w1_7,'2026-06-03','absent',c1),
      (w1_7,'2026-06-04','present',c1),(w1_7,'2026-06-05','present',c1),(w1_7,'2026-06-06','present',c1),
      (w1_7,'2026-06-09','present',c1),(w1_7,'2026-06-10','present',c1),
      (w1_8,'2026-05-27','present',c1),(w1_8,'2026-05-28','present',c1),(w1_8,'2026-05-29','present',c1),
      (w1_8,'2026-05-30','present',c1),(w1_8,'2026-06-02','present',c1),(w1_8,'2026-06-03','present',c1),
      (w1_8,'2026-06-04','present',c1),(w1_8,'2026-06-05','present',c1),(w1_8,'2026-06-06','present',c1),
      (w1_8,'2026-06-09','present',c1),(w1_8,'2026-06-10','present',c1),
      (w1_9,'2026-05-27','present',c1),(w1_9,'2026-05-28','present',c1),(w1_9,'2026-05-29','present',c1),
      (w1_9,'2026-05-30','present',c1),(w1_9,'2026-06-02','present',c1),(w1_9,'2026-06-03','present',c1),
      (w1_9,'2026-06-04','leave',c1),(w1_9,'2026-06-05','present',c1),(w1_9,'2026-06-06','present',c1),
      (w1_9,'2026-06-09','present',c1),(w1_9,'2026-06-10','present',c1),
      (w1_10,'2026-05-27','present',c1),(w1_10,'2026-05-28','absent',c1),(w1_10,'2026-05-29','present',c1),
      (w1_10,'2026-05-30','present',c1),(w1_10,'2026-06-02','present',c1),(w1_10,'2026-06-03','present',c1),
      (w1_10,'2026-06-04','present',c1),(w1_10,'2026-06-05','present',c1),(w1_10,'2026-06-06','absent',c1),
      (w1_10,'2026-06-09','present',c1),(w1_10,'2026-06-10','present',c1)
    ON CONFLICT (worker_id, date) DO NOTHING;
  END IF;

  -- ==============================================================
  -- UNIT 1 — MAINTENANCE (fortnight)
  -- ==============================================================
  IF a1_crusher IS NOT NULL THEN
    IF NOT EXISTS(SELECT 1 FROM maintenance_records WHERE asset_id=a1_crusher AND title='Jaw plate inspection — June' AND scheduled_date='2026-06-05') THEN
      INSERT INTO maintenance_records(asset_id,asset_type,title,description,scheduled_date,completed_date,cost,vendor_name,next_service_date,status,crusher_id)
      VALUES(a1_crusher,'machinery','Jaw plate inspection — June','Monthly lubrication and jaw plate wear check','2026-06-05','2026-06-05',8500,'Crusher Care Services','2026-07-05','completed',c1);
    END IF;
    IF NOT EXISTS(SELECT 1 FROM maintenance_records WHERE asset_id=a1_crusher AND title='Bearing replacement — main shaft' AND scheduled_date='2026-05-30') THEN
      INSERT INTO maintenance_records(asset_id,asset_type,title,description,scheduled_date,completed_date,cost,vendor_name,next_service_date,status,crusher_id)
      VALUES(a1_crusher,'machinery','Bearing replacement — main shaft','Main shaft bearing failure detected, replaced under warranty','2026-05-30','2026-05-31',38000,'Metso Parts India','2026-11-30','completed',c1);
    END IF;
  END IF;
  IF a1_screen IS NOT NULL THEN
    IF NOT EXISTS(SELECT 1 FROM maintenance_records WHERE asset_id=a1_screen AND title='Screen mesh replacement' AND scheduled_date='2026-06-02') THEN
      INSERT INTO maintenance_records(asset_id,asset_type,title,description,scheduled_date,completed_date,cost,vendor_name,next_service_date,status,crusher_id)
      VALUES(a1_screen,'machinery','Screen mesh replacement','Worn 20mm deck mesh replaced','2026-06-02','2026-06-03',15500,'Hosur Wire Mesh Pvt Ltd','2026-09-02','completed',c1);
    END IF;
  END IF;
  IF a1_gen IS NOT NULL THEN
    IF NOT EXISTS(SELECT 1 FROM maintenance_records WHERE asset_id=a1_gen AND title='DG Set service & oil change' AND scheduled_date='2026-06-07') THEN
      INSERT INTO maintenance_records(asset_id,asset_type,title,description,scheduled_date,completed_date,cost,vendor_name,next_service_date,status,crusher_id)
      VALUES(a1_gen,'machinery','DG Set service & oil change','500-hour service — oil filter, fuel filter, battery check','2026-06-07',NULL,12000,'Kirloskar Service Centre','2026-09-07','scheduled',c1);
    END IF;
  END IF;
  IF v1_5 IS NOT NULL THEN
    IF NOT EXISTS(SELECT 1 FROM maintenance_records WHERE asset_id=v1_5 AND title='Tipper tyre replacement' AND scheduled_date='2026-05-29') THEN
      INSERT INTO maintenance_records(asset_id,asset_type,title,description,scheduled_date,completed_date,cost,vendor_name,next_service_date,status,crusher_id)
      VALUES(v1_5,'vehicle','Tipper tyre replacement','Front axle tyre burst on site, replaced pair','2026-05-29','2026-05-29',18400,'Hosur Tyres & Auto','2026-11-29','completed',c1);
    END IF;
  END IF;

  -- ==============================================================
  -- UNIT 1 — LEDGER  (fortnight receipts + payments + opex)
  -- ==============================================================
  IF pa1_1 IS NOT NULL THEN
    INSERT INTO ledger_transactions(txn_type,party_id,amount,narration,txn_date,payment_mode,crusher_id)
    VALUES
      -- Receipts
      ('receipt',pa1_1, 49087,  'Against HU1/2526/0016 — M-Sand 55MT',             '2026-05-28','upi',   c1),
      ('receipt',pa1_2, 76230,  'Against HU1/2526/0017 — 20mm 66MT',               '2026-05-28','cheque',c1),
      ('receipt',pa1_3, 40162,  'Against HU1/2526/0018 — P-Sand',                   '2026-05-29','cash',  c1),
      ('receipt',pa1_1, 58012,  'Against HU1/2526/0020 — M-Sand 65MT',             '2026-05-30','upi',   c1),
      ('receipt',pa1_2, 45738,  'Against HU1/2526/0021 — 6mm Chips',               '2026-05-30','cash',  c1),
      ('receipt',pa1_3, 70560,  'Against HU1/2526/0022 — P-Sand',                   '2026-05-31','upi',   c1),
      ('receipt',pa1_4, 92400,  'Against HU1/2526/0023 — 40mm Blue Metal',         '2026-05-31','cheque',c1),
      ('receipt',pa1_1, 44625,  'Against HU1/2526/0024',                            '2026-06-03','cash',  c1),
      ('receipt',pa1_2, 61215,  'Against HU1/2526/0025 — 20mm 53MT',               '2026-06-03','upi',   c1),
      ('receipt',pa1_3, 79800,  'Against HU1/2526/0026',                            '2026-06-04','cheque',c1),
      ('receipt',pa1_4, 86625,  'Against HU1/2526/0027',                            '2026-06-04','cheque',c1),
      ('receipt',pa1_1, 53550,  'Against HU1/2526/0028',                            '2026-06-05','upi',   c1),
      ('receipt',pa1_2, 66990,  'Against HU1/2526/0029',                            '2026-06-06','cash',  c1),
      ('receipt',pa1_3, 49980,  'Against HU1/2526/0030',                            '2026-06-06','upi',   c1),
      ('receipt',pa1_4,115500,  'Against HU1/2526/0031 — bulk 40mm',               '2026-06-07','cheque',c1),
      ('receipt',pa1_1, 60690,  'Against HU1/2526/0032',                            '2026-06-10','upi',   c1),
      ('receipt',pa1_2, 46200,  'Against HU1/2526/0033',                            '2026-06-10','cash',  c1),
      -- Partial receipt on credit sale 0019
      ('receipt',pa1_4, 50000,  'Part payment — HU1/2526/0019 (balance 53950)',     '2026-06-02','cheque',c1),
      -- Supplier payments
      ('payment',pa1_5,176400,  'Raw material — PUR/HU1/0007',                     '2026-05-30','cheque',c1),
      ('payment',pa1_6, 66150,  'Transport — PUR/HU1/0008',                        '2026-06-05','cash',  c1),
      -- Opex journal entries
      ('journal',NULL,  54300,  'Diesel — 500 litres @ Rs.108.60',                  '2026-05-31','cash',  c1),
      ('journal',NULL,  38000,  'Bearing replacement — main shaft (non-warranty)',   '2026-06-01','cash',  c1),
      ('journal',NULL,  15500,  'Screen mesh replacement',                           '2026-06-03','cash',  c1),
      ('journal',NULL,  18400,  'Tipper tyre replacement TN33 AE 7890',             '2026-05-29','cash',  c1),
      ('journal',NULL,   8500,  'Jaw plate inspection — June 2026',                 '2026-06-05','cash',  c1),
      ('journal',NULL,  14500,  'Diesel — 133 litres @ Rs.109 (top-up)',            '2026-06-08','cash',  c1),
      ('journal',NULL,   6800,  'Canteen & welfare expenses — June',                '2026-06-05','cash',  c1),
      ('journal',NULL,   4200,  'Stationery & office supplies',                     '2026-06-01','cash',  c1)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ==============================================================
  -- UNIT 2 — NEW VEHICLES
  -- ==============================================================
  INSERT INTO vehicles (registration_number, owner_name, vehicle_type, capacity_mt, status, crusher_id) VALUES
    ('TN30 BM 1122', 'Thirumaran',  'Tipper',  12, 'active',      c2),
    ('TN30 BN 3344', 'Vadivel',     'Tipper',  10, 'active',      c2),
    ('TN30 BP 5566', 'Karthikeyan', 'Tractor',  5, 'maintenance', c2)
  ON CONFLICT (registration_number) DO NOTHING;
  SELECT id INTO v2_4 FROM vehicles WHERE registration_number = 'TN30 BM 1122' LIMIT 1;
  SELECT id INTO v2_5 FROM vehicles WHERE registration_number = 'TN30 BN 3344' LIMIT 1;
  SELECT id INTO v2_6 FROM vehicles WHERE registration_number = 'TN30 BP 5566' LIMIT 1;

  -- ==============================================================
  -- UNIT 2 — NEW MACHINERY ASSETS
  -- ==============================================================
  IF NOT EXISTS(SELECT 1 FROM assets WHERE name='Vibrating Screen 5x10 Salem' AND crusher_id=c2) THEN
    INSERT INTO assets(name,asset_type,serial_number,purchase_date,purchase_cost,crusher_id)
    VALUES('Vibrating Screen 5x10 Salem','machinery','VS-5X10-SLM-2023','2023-09-15',1150000,c2);
  END IF;
  IF NOT EXISTS(SELECT 1 FROM assets WHERE name='Water Pump 7.5HP Salem' AND crusher_id=c2) THEN
    INSERT INTO assets(name,asset_type,serial_number,purchase_date,purchase_cost,crusher_id)
    VALUES('Water Pump 7.5HP Salem','machinery','WP-7.5-SLM-2024','2024-02-20',85000,c2);
  END IF;
  SELECT id INTO a2_screen FROM assets WHERE name='Vibrating Screen 5x10 Salem' AND crusher_id=c2 LIMIT 1;
  SELECT id INTO a2_pump   FROM assets WHERE name='Water Pump 7.5HP Salem'       AND crusher_id=c2 LIMIT 1;

  -- ==============================================================
  -- UNIT 2 — NEW WORKERS
  -- ==============================================================
  IF NOT EXISTS(SELECT 1 FROM workers WHERE name='Saravanan B'   AND crusher_id=c2) THEN
    INSERT INTO workers(name,phone,designation,wage_type,wage_rate,joining_date,crusher_id)
    VALUES('Saravanan B','9944501005','Screen Operator','daily',590,'2024-07-01',c2);
  END IF;
  IF NOT EXISTS(SELECT 1 FROM workers WHERE name='Thirunavukkarasu R' AND crusher_id=c2) THEN
    INSERT INTO workers(name,phone,designation,wage_type,wage_rate,joining_date,crusher_id)
    VALUES('Thirunavukkarasu R','9944501006','Loader Operator','daily',630,'2023-11-10',c2);
  END IF;
  IF NOT EXISTS(SELECT 1 FROM workers WHERE name='Uma Devi K'    AND crusher_id=c2) THEN
    INSERT INTO workers(name,phone,designation,wage_type,wage_rate,joining_date,crusher_id)
    VALUES('Uma Devi K','9944501007','Gate Clerk','monthly',12500,'2025-02-01',c2);
  END IF;
  IF NOT EXISTS(SELECT 1 FROM workers WHERE name='Velayutham C'  AND crusher_id=c2) THEN
    INSERT INTO workers(name,phone,designation,wage_type,wage_rate,joining_date,crusher_id)
    VALUES('Velayutham C','9944501008','Security Guard','monthly',10500,'2024-01-15',c2);
  END IF;
  IF NOT EXISTS(SELECT 1 FROM workers WHERE name='Xavier A'      AND crusher_id=c2) THEN
    INSERT INTO workers(name,phone,designation,wage_type,wage_rate,joining_date,crusher_id)
    VALUES('Xavier A','9944501009','Helper','daily',460,'2025-04-05',c2);
  END IF;
  SELECT id INTO w2_5 FROM workers WHERE name='Saravanan B'           AND crusher_id=c2 LIMIT 1;
  SELECT id INTO w2_6 FROM workers WHERE name='Thirunavukkarasu R'    AND crusher_id=c2 LIMIT 1;
  SELECT id INTO w2_7 FROM workers WHERE name='Uma Devi K'            AND crusher_id=c2 LIMIT 1;
  SELECT id INTO w2_8 FROM workers WHERE name='Velayutham C'          AND crusher_id=c2 LIMIT 1;
  SELECT id INTO w2_9 FROM workers WHERE name='Xavier A'              AND crusher_id=c2 LIMIT 1;

  -- ==============================================================
  -- UNIT 2 — SALES (fortnight)
  -- ==============================================================
  IF pa2_1 IS NOT NULL AND p2_msand IS NOT NULL THEN
    INSERT INTO sales(invoice_number,party_id,sale_date,subtotal,taxable_amount,cgst_amount,sgst_amount,total_tax,grand_total,amount_received,balance_due,payment_mode,status,vehicle_id,crusher_id,created_by)
    VALUES
      ('SU2/2526/0011',pa2_1,'2026-05-27', 52200, 52200, 1305,   1305,   2610,   54810,  54810, 0,     'upi',   'confirmed',v2_4,c2,u_op1),
      ('SU2/2526/0012',pa2_2,'2026-05-27', 78400, 78400, 1960,   1960,   3920,   82320,  82320, 0,     'cheque','confirmed',v2_2,c2,u_op1),
      ('SU2/2526/0013',pa2_3,'2026-05-28',102000,102000, 2550,   2550,   5100,  107100, 107100, 0,     'cheque','confirmed',v2_3,c2,u_sales),
      ('SU2/2526/0014',pa2_4,'2026-05-28', 43500, 43500, 1087.5, 1087.5, 2175,   45675,  45675, 0,     'upi',   'confirmed',v2_5,c2,u_sales),
      ('SU2/2526/0015',pa2_1,'2026-05-29', 60900, 60900, 1522.5, 1522.5, 3045,   63945,  63945, 0,     'upi',   'confirmed',v2_4,c2,u_op1),
      ('SU2/2526/0016',pa2_2,'2026-05-29', 56700, 56700, 1417.5, 1417.5, 2835,   59535,  59535, 0,     'cash',  'confirmed',v2_1,c2,u_op1),
      ('SU2/2526/0017',pa2_3,'2026-05-30', 89600, 89600, 2240,   2240,   4480,   94080,  94080, 0,     'cheque','confirmed',v2_2,c2,u_sales),
      ('SU2/2526/0018',pa2_4,'2026-05-30', 47100, 47100, 1177.5, 1177.5, 2355,   49455,  0,    49455,  'credit','confirmed',v2_3,c2,u_sales),
      ('SU2/2526/0019',pa2_1,'2026-06-02', 63840, 63840, 1596,   1596,   3192,   67032,  67032, 0,     'upi',   'confirmed',v2_5,c2,u_op1),
      ('SU2/2526/0020',pa2_2,'2026-06-02', 84000, 84000, 2100,   2100,   4200,   88200,  88200, 0,     'cheque','confirmed',v2_4,c2,u_op1),
      ('SU2/2526/0021',pa2_3,'2026-06-03',112000,112000, 2800,   2800,   5600,  117600, 117600, 0,     'cheque','confirmed',v2_1,c2,u_sales),
      ('SU2/2526/0022',pa2_4,'2026-06-04', 48000, 48000, 1200,   1200,   2400,   50400,  50400, 0,     'upi',   'confirmed',v2_2,c2,u_sales),
      ('SU2/2526/0023',pa2_1,'2026-06-05', 69600, 69600, 1740,   1740,   3480,   73080,  73080, 0,     'upi',   'confirmed',v2_5,c2,u_op1),
      ('SU2/2526/0024',pa2_2,'2026-06-05', 67200, 67200, 1680,   1680,   3360,   70560,  70560, 0,     'cheque','confirmed',v2_3,c2,u_op1),
      ('SU2/2526/0025',pa2_3,'2026-06-06', 91000, 91000, 2275,   2275,   4550,   95550,  95550, 0,     'cheque','confirmed',v2_4,c2,u_sales),
      ('SU2/2526/0026',pa2_4,'2026-06-09', 54000, 54000, 1350,   1350,   2700,   56700,  56700, 0,     'upi',   'confirmed',v2_1,c2,u_sales),
      ('SU2/2526/0027',pa2_1,'2026-06-09', 78400, 78400, 1960,   1960,   3920,   82320,  82320, 0,     'cheque','confirmed',v2_5,c2,u_op1),
      ('SU2/2526/0028',pa2_2,'2026-06-10', 52200, 52200, 1305,   1305,   2610,   54810,  54810, 0,     'upi',   'confirmed',v2_2,c2,u_op1),
      ('SU2/2526/0029',pa2_3,'2026-06-10',105600,105600, 2640,   2640,   5280,  110880, 110880, 0,     'cheque','confirmed',v2_4,c2,u_sales),
      ('SU2/2526/0030',pa2_4,'2026-06-10', 48000, 48000, 1200,   1200,   2400,   50400,  0,    50400,  'credit','confirmed',v2_3,c2,u_sales)
    ON CONFLICT (invoice_number) DO NOTHING;

    -- Sale items (one per invoice for brevity — enough for P&L)
    SELECT id INTO s FROM sales WHERE crusher_id=c2 AND invoice_number='SU2/2526/0011' LIMIT 1;
    IF s IS NOT NULL AND NOT EXISTS(SELECT 1 FROM sale_items WHERE sale_id=s) THEN
      INSERT INTO sale_items(sale_id,product_id,product_name,hsn_code,unit,quantity,rate,amount,gst_rate,cgst_rate,sgst_rate,cgst_amount,sgst_amount,total_amount)
      VALUES(s,p2_msand,'M-Sand','25171010','MT',60,870,52200,5,2.5,2.5,1305,1305,54810);
    END IF;
    SELECT id INTO s FROM sales WHERE crusher_id=c2 AND invoice_number='SU2/2526/0012' LIMIT 1;
    IF s IS NOT NULL AND NOT EXISTS(SELECT 1 FROM sale_items WHERE sale_id=s) THEN
      INSERT INTO sale_items(sale_id,product_id,product_name,hsn_code,unit,quantity,rate,amount,gst_rate,cgst_rate,sgst_rate,cgst_amount,sgst_amount,total_amount)
      VALUES(s,p2_20mm,'20mm Blue Metal','25171010','MT',70,1120,78400,5,2.5,2.5,1960,1960,82320);
    END IF;
    SELECT id INTO s FROM sales WHERE crusher_id=c2 AND invoice_number='SU2/2526/0013' LIMIT 1;
    IF s IS NOT NULL AND NOT EXISTS(SELECT 1 FROM sale_items WHERE sale_id=s) THEN
      INSERT INTO sale_items(sale_id,product_id,product_name,hsn_code,unit,quantity,rate,amount,gst_rate,cgst_rate,sgst_rate,cgst_amount,sgst_amount,total_amount)
      VALUES(s,p2_40mm,'40mm Blue Metal','25171010','MT',102,1000,102000,5,2.5,2.5,2550,2550,107100);
    END IF;
    SELECT id INTO s FROM sales WHERE crusher_id=c2 AND invoice_number='SU2/2526/0014' LIMIT 1;
    IF s IS NOT NULL AND NOT EXISTS(SELECT 1 FROM sale_items WHERE sale_id=s) THEN
      INSERT INTO sale_items(sale_id,product_id,product_name,hsn_code,unit,quantity,rate,amount,gst_rate,cgst_rate,sgst_rate,cgst_amount,sgst_amount,total_amount)
      VALUES(s,p2_dust,'Quarry Dust','25171010','MT',72.5,600,43500,5,2.5,2.5,1087.5,1087.5,45675);
    END IF;
    SELECT id INTO s FROM sales WHERE crusher_id=c2 AND invoice_number='SU2/2526/0015' LIMIT 1;
    IF s IS NOT NULL AND NOT EXISTS(SELECT 1 FROM sale_items WHERE sale_id=s) THEN
      INSERT INTO sale_items(sale_id,product_id,product_name,hsn_code,unit,quantity,rate,amount,gst_rate,cgst_rate,sgst_rate,cgst_amount,sgst_amount,total_amount)
      VALUES(s,p2_psand,'P-Sand','25171010','MT',62.78,970,60896.6,5,2.5,2.5,1522.415,1522.415,63941.43);
    END IF;
    SELECT id INTO s FROM sales WHERE crusher_id=c2 AND invoice_number='SU2/2526/0019' LIMIT 1;
    IF s IS NOT NULL AND NOT EXISTS(SELECT 1 FROM sale_items WHERE sale_id=s) THEN
      INSERT INTO sale_items(sale_id,product_id,product_name,hsn_code,unit,quantity,rate,amount,gst_rate,cgst_rate,sgst_rate,cgst_amount,sgst_amount,total_amount)
      VALUES(s,p2_msand,'M-Sand','25171010','MT',73.38,870,63840.6,5,2.5,2.5,1596.015,1596.015,67032.63);
    END IF;
    SELECT id INTO s FROM sales WHERE crusher_id=c2 AND invoice_number='SU2/2526/0021' LIMIT 1;
    IF s IS NOT NULL AND NOT EXISTS(SELECT 1 FROM sale_items WHERE sale_id=s) THEN
      INSERT INTO sale_items(sale_id,product_id,product_name,hsn_code,unit,quantity,rate,amount,gst_rate,cgst_rate,sgst_rate,cgst_amount,sgst_amount,total_amount)
      VALUES(s,p2_40mm,'40mm Blue Metal','25171010','MT',112,1000,112000,5,2.5,2.5,2800,2800,117600);
    END IF;
    SELECT id INTO s FROM sales WHERE crusher_id=c2 AND invoice_number='SU2/2526/0025' LIMIT 1;
    IF s IS NOT NULL AND NOT EXISTS(SELECT 1 FROM sale_items WHERE sale_id=s) THEN
      INSERT INTO sale_items(sale_id,product_id,product_name,hsn_code,unit,quantity,rate,amount,gst_rate,cgst_rate,sgst_rate,cgst_amount,sgst_amount,total_amount)
      VALUES(s,p2_20mm,'20mm Blue Metal','25171010','MT',81.25,1120,91000,5,2.5,2.5,2275,2275,95550);
    END IF;
    SELECT id INTO s FROM sales WHERE crusher_id=c2 AND invoice_number='SU2/2526/0029' LIMIT 1;
    IF s IS NOT NULL AND NOT EXISTS(SELECT 1 FROM sale_items WHERE sale_id=s) THEN
      INSERT INTO sale_items(sale_id,product_id,product_name,hsn_code,unit,quantity,rate,amount,gst_rate,cgst_rate,sgst_rate,cgst_amount,sgst_amount,total_amount)
      VALUES(s,p2_40mm,'40mm Blue Metal','25171010','MT',105.6,1000,105600,5,2.5,2.5,2640,2640,110880);
    END IF;
  END IF;

  -- ==============================================================
  -- UNIT 2 — PURCHASES (fortnight)
  -- ==============================================================
  IF pa2_5 IS NOT NULL THEN
    IF NOT EXISTS(SELECT 1 FROM purchases WHERE bill_number='PUR/SU2/0006' AND crusher_id=c2) THEN
      INSERT INTO purchases(bill_number,party_id,purchase_date,subtotal,taxable_amount,cgst_amount,sgst_amount,grand_total,amount_paid,balance_due,payment_mode,crusher_id,created_by)
      VALUES('PUR/SU2/0006',pa2_5,'2026-05-28',189000,189000,4725,4725,198450,198450,0,'cheque',c2,u_accounts);
    END IF;
    IF NOT EXISTS(SELECT 1 FROM purchases WHERE bill_number='PUR/SU2/0007' AND crusher_id=c2) THEN
      INSERT INTO purchases(bill_number,party_id,purchase_date,subtotal,taxable_amount,cgst_amount,sgst_amount,grand_total,amount_paid,balance_due,payment_mode,crusher_id,created_by)
      VALUES('PUR/SU2/0007',pa2_6,'2026-06-04',75600,75600,1890,1890,79380,79380,0,'cash',c2,u_accounts);
    END IF;
    IF NOT EXISTS(SELECT 1 FROM purchases WHERE bill_number='PUR/SU2/0008' AND crusher_id=c2) THEN
      INSERT INTO purchases(bill_number,party_id,purchase_date,subtotal,taxable_amount,cgst_amount,sgst_amount,grand_total,amount_paid,balance_due,payment_mode,crusher_id,created_by)
      VALUES('PUR/SU2/0008',pa2_5,'2026-06-09',226800,226800,5670,5670,238140,0,238140,'cheque',c2,u_accounts);
    END IF;

    SELECT id INTO s FROM purchases WHERE crusher_id=c2 AND bill_number='PUR/SU2/0006' LIMIT 1;
    IF s IS NOT NULL AND NOT EXISTS(SELECT 1 FROM purchase_items WHERE purchase_id=s) THEN
      INSERT INTO purchase_items(purchase_id,product_id,product_name,unit,quantity,rate,amount,gst_rate,cgst_amount,sgst_amount,total_amount)
      VALUES(s,p2_20mm,'20mm Blue Metal','MT',350,540,189000,5,4725,4725,198450);
    END IF;
    SELECT id INTO s FROM purchases WHERE crusher_id=c2 AND bill_number='PUR/SU2/0008' LIMIT 1;
    IF s IS NOT NULL AND NOT EXISTS(SELECT 1 FROM purchase_items WHERE purchase_id=s) THEN
      INSERT INTO purchase_items(purchase_id,product_id,product_name,unit,quantity,rate,amount,gst_rate,cgst_amount,sgst_amount,total_amount)
      VALUES(s,p2_msand,'M-Sand','MT',528,430,227040,5,5676,5676,238392);
    END IF;
  END IF;

  -- ==============================================================
  -- UNIT 2 — ATTENDANCE (May 27 – Jun 10)
  -- ==============================================================
  IF w2_1 IS NOT NULL THEN
    INSERT INTO attendance(worker_id,date,status,crusher_id) VALUES
      (w2_1,'2026-05-27','present',c2),(w2_1,'2026-05-28','present',c2),(w2_1,'2026-05-29','present',c2),
      (w2_1,'2026-05-30','present',c2),(w2_1,'2026-06-02','present',c2),(w2_1,'2026-06-03','present',c2),
      (w2_1,'2026-06-04','absent',c2),(w2_1,'2026-06-05','present',c2),(w2_1,'2026-06-06','present',c2),
      (w2_1,'2026-06-09','present',c2),(w2_1,'2026-06-10','present',c2),
      (w2_2,'2026-05-27','present',c2),(w2_2,'2026-05-28','present',c2),(w2_2,'2026-05-29','present',c2),
      (w2_2,'2026-05-30','present',c2),(w2_2,'2026-06-02','present',c2),(w2_2,'2026-06-03','present',c2),
      (w2_2,'2026-06-04','present',c2),(w2_2,'2026-06-05','present',c2),(w2_2,'2026-06-06','present',c2),
      (w2_2,'2026-06-09','present',c2),(w2_2,'2026-06-10','present',c2),
      (w2_3,'2026-05-27','absent',c2),(w2_3,'2026-05-28','present',c2),(w2_3,'2026-05-29','present',c2),
      (w2_3,'2026-05-30','half_day',c2),(w2_3,'2026-06-02','present',c2),(w2_3,'2026-06-03','present',c2),
      (w2_3,'2026-06-04','present',c2),(w2_3,'2026-06-05','absent',c2),(w2_3,'2026-06-06','present',c2),
      (w2_3,'2026-06-09','present',c2),(w2_3,'2026-06-10','present',c2),
      (w2_4,'2026-05-27','present',c2),(w2_4,'2026-05-28','present',c2),(w2_4,'2026-05-29','leave',c2),
      (w2_4,'2026-05-30','present',c2),(w2_4,'2026-06-02','present',c2),(w2_4,'2026-06-03','present',c2),
      (w2_4,'2026-06-04','present',c2),(w2_4,'2026-06-05','present',c2),(w2_4,'2026-06-06','present',c2),
      (w2_4,'2026-06-09','present',c2),(w2_4,'2026-06-10','present',c2)
    ON CONFLICT(worker_id,date) DO NOTHING;
  END IF;

  IF w2_5 IS NOT NULL THEN
    INSERT INTO attendance(worker_id,date,status,crusher_id) VALUES
      (w2_5,'2026-05-27','present',c2),(w2_5,'2026-05-28','present',c2),(w2_5,'2026-05-29','present',c2),
      (w2_5,'2026-05-30','present',c2),(w2_5,'2026-06-02','absent',c2),(w2_5,'2026-06-03','present',c2),
      (w2_5,'2026-06-04','present',c2),(w2_5,'2026-06-05','present',c2),(w2_5,'2026-06-06','present',c2),
      (w2_5,'2026-06-09','present',c2),(w2_5,'2026-06-10','present',c2),
      (w2_6,'2026-05-27','present',c2),(w2_6,'2026-05-28','present',c2),(w2_6,'2026-05-29','present',c2),
      (w2_6,'2026-05-30','present',c2),(w2_6,'2026-06-02','present',c2),(w2_6,'2026-06-03','present',c2),
      (w2_6,'2026-06-04','present',c2),(w2_6,'2026-06-05','half_day',c2),(w2_6,'2026-06-06','present',c2),
      (w2_6,'2026-06-09','present',c2),(w2_6,'2026-06-10','present',c2),
      (w2_7,'2026-05-27','present',c2),(w2_7,'2026-05-28','present',c2),(w2_7,'2026-05-29','present',c2),
      (w2_7,'2026-05-30','present',c2),(w2_7,'2026-06-02','present',c2),(w2_7,'2026-06-03','present',c2),
      (w2_7,'2026-06-04','present',c2),(w2_7,'2026-06-05','present',c2),(w2_7,'2026-06-06','present',c2),
      (w2_7,'2026-06-09','present',c2),(w2_7,'2026-06-10','present',c2),
      (w2_8,'2026-05-27','present',c2),(w2_8,'2026-05-28','present',c2),(w2_8,'2026-05-29','present',c2),
      (w2_8,'2026-05-30','present',c2),(w2_8,'2026-06-02','present',c2),(w2_8,'2026-06-03','present',c2),
      (w2_8,'2026-06-04','present',c2),(w2_8,'2026-06-05','present',c2),(w2_8,'2026-06-06','present',c2),
      (w2_8,'2026-06-09','present',c2),(w2_8,'2026-06-10','present',c2),
      (w2_9,'2026-05-27','absent',c2),(w2_9,'2026-05-28','present',c2),(w2_9,'2026-05-29','present',c2),
      (w2_9,'2026-05-30','present',c2),(w2_9,'2026-06-02','present',c2),(w2_9,'2026-06-03','absent',c2),
      (w2_9,'2026-06-04','present',c2),(w2_9,'2026-06-05','present',c2),(w2_9,'2026-06-06','present',c2),
      (w2_9,'2026-06-09','present',c2),(w2_9,'2026-06-10','present',c2)
    ON CONFLICT(worker_id,date) DO NOTHING;
  END IF;

  -- ==============================================================
  -- UNIT 2 — MAINTENANCE (fortnight)
  -- ==============================================================
  IF a2_crusher IS NOT NULL THEN
    IF NOT EXISTS(SELECT 1 FROM maintenance_records WHERE asset_id=a2_crusher AND title='Monthly rotor & bearing inspection' AND scheduled_date='2026-06-08') THEN
      INSERT INTO maintenance_records(asset_id,asset_type,title,description,scheduled_date,completed_date,cost,vendor_name,next_service_date,status,crusher_id)
      VALUES(a2_crusher,'machinery','Monthly rotor & bearing inspection','VSI rotor and bearing check','2026-06-08',NULL,9200,'VSI Spares Chennai','2026-07-08','scheduled',c2);
    END IF;
    IF NOT EXISTS(SELECT 1 FROM maintenance_records WHERE asset_id=a2_crusher AND title='Oil seal replacement' AND scheduled_date='2026-05-28') THEN
      INSERT INTO maintenance_records(asset_id,asset_type,title,description,scheduled_date,completed_date,cost,vendor_name,next_service_date,status,crusher_id)
      VALUES(a2_crusher,'machinery','Oil seal replacement','Top bearing oil seal replaced after minor leak','2026-05-28','2026-05-28',6800,'VSI Spares Chennai','2026-11-28','completed',c2);
    END IF;
  END IF;
  IF a2_screen IS NOT NULL THEN
    IF NOT EXISTS(SELECT 1 FROM maintenance_records WHERE asset_id=a2_screen AND title='Screen mesh replacement — Salem' AND scheduled_date='2026-06-04') THEN
      INSERT INTO maintenance_records(asset_id,asset_type,title,description,scheduled_date,completed_date,cost,vendor_name,next_service_date,status,crusher_id)
      VALUES(a2_screen,'machinery','Screen mesh replacement — Salem','40mm deck mesh worn, replaced','2026-06-04','2026-06-05',17200,'Salem Wire Products','2026-09-04','completed',c2);
    END IF;
  END IF;
  IF v2_4 IS NOT NULL THEN
    IF NOT EXISTS(SELECT 1 FROM maintenance_records WHERE asset_id=v2_4 AND title='Brake pad replacement' AND scheduled_date='2026-06-02') THEN
      INSERT INTO maintenance_records(asset_id,asset_type,title,description,scheduled_date,completed_date,cost,vendor_name,next_service_date,status,crusher_id)
      VALUES(v2_4,'vehicle','Brake pad replacement','Rear brake pads worn, replaced all 4 corners','2026-06-02','2026-06-02',9600,'Salem Tyres & Auto','2026-12-02','completed',c2);
    END IF;
  END IF;

  -- ==============================================================
  -- UNIT 2 — LEDGER (fortnight)
  -- ==============================================================
  IF pa2_1 IS NOT NULL THEN
    INSERT INTO ledger_transactions(txn_type,party_id,amount,narration,txn_date,payment_mode,crusher_id)
    VALUES
      -- Receipts
      ('receipt',pa2_1, 54810,  'Against SU2/2526/0011 — M-Sand 60MT',             '2026-05-28','upi',   c2),
      ('receipt',pa2_2, 82320,  'Against SU2/2526/0012 — 20mm 70MT',               '2026-05-28','cheque',c2),
      ('receipt',pa2_3,107100,  'Against SU2/2526/0013 — 40mm 102MT',              '2026-05-29','cheque',c2),
      ('receipt',pa2_4, 45675,  'Against SU2/2526/0014 — Quarry Dust',             '2026-05-29','upi',   c2),
      ('receipt',pa2_1, 63945,  'Against SU2/2526/0015 — P-Sand',                  '2026-05-30','upi',   c2),
      ('receipt',pa2_2, 59535,  'Against SU2/2526/0016',                            '2026-05-30','cash',  c2),
      ('receipt',pa2_3, 94080,  'Against SU2/2526/0017',                            '2026-05-31','cheque',c2),
      ('receipt',pa2_1, 67032,  'Against SU2/2526/0019',                            '2026-06-03','upi',   c2),
      ('receipt',pa2_2, 88200,  'Against SU2/2526/0020',                            '2026-06-03','cheque',c2),
      ('receipt',pa2_3,117600,  'Against SU2/2526/0021',                            '2026-06-04','cheque',c2),
      ('receipt',pa2_4, 50400,  'Against SU2/2526/0022',                            '2026-06-05','upi',   c2),
      ('receipt',pa2_1, 73080,  'Against SU2/2526/0023',                            '2026-06-06','upi',   c2),
      ('receipt',pa2_2, 70560,  'Against SU2/2526/0024',                            '2026-06-06','cheque',c2),
      ('receipt',pa2_3, 95550,  'Against SU2/2526/0025',                            '2026-06-07','cheque',c2),
      ('receipt',pa2_4, 56700,  'Against SU2/2526/0026',                            '2026-06-10','upi',   c2),
      ('receipt',pa2_1, 82320,  'Against SU2/2526/0027',                            '2026-06-10','cheque',c2),
      -- Partial on credit sale 0018
      ('receipt',pa2_4, 25000,  'Part payment — SU2/2526/0018 (balance 24455)',     '2026-06-05','upi',   c2),
      -- Supplier payments
      ('payment',pa2_5,198450,  'Raw material — PUR/SU2/0006',                     '2026-05-30','cheque',c2),
      ('payment',pa2_6, 79380,  'Transport — PUR/SU2/0007',                        '2026-06-06','cash',  c2),
      -- Opex journal entries
      ('journal',NULL,  51840,  'Diesel — 480 litres @ Rs.108',                    '2026-05-31','cash',  c2),
      ('journal',NULL,   6800,  'Oil seal replacement — VSI crusher',               '2026-05-29','cash',  c2),
      ('journal',NULL,  17200,  'Screen mesh replacement — 40mm deck',             '2026-06-05','cash',  c2),
      ('journal',NULL,   9600,  'Brake pad replacement — TN30 BM 1122',            '2026-06-02','cash',  c2),
      ('journal',NULL,  55080,  'Diesel — 507 litres @ Rs.108.64',                 '2026-06-08','cash',  c2),
      ('journal',NULL,   7200,  'Canteen & welfare expenses',                       '2026-06-06','cash',  c2),
      ('journal',NULL,   3800,  'Internet & communication charges',                '2026-06-01','cash',  c2)
    ON CONFLICT DO NOTHING;
  END IF;

END $$;
