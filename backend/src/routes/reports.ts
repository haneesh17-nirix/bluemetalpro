import { Router } from 'express';
import { query } from '../config/db';
import { authenticate, authorize } from '../middleware/auth';

export const reportsRouter = Router();
reportsRouter.use(authenticate);
reportsRouter.use(authorize('admin', 'report_viewer', 'accounts'));

// Item-wise sales report
reportsRouter.get('/item-wise', async (req, res) => {
  const { from, to } = req.query;
  const rows = await query(`
    SELECT
      pr.name AS product_name,
      pr.category,
      pr.unit,
      pr.hsn_code,
      SUM(si.quantity) AS total_quantity,
      SUM(si.amount) AS total_amount,
      SUM(si.cgst_amount) AS total_cgst,
      SUM(si.sgst_amount) AS total_sgst,
      SUM(si.igst_amount) AS total_igst,
      SUM(si.total_amount) AS total_with_gst,
      COUNT(DISTINCT si.sale_id) AS num_invoices
    FROM sale_items si
    JOIN sales s ON s.id = si.sale_id AND s.status = 'confirmed'
    JOIN products pr ON pr.id = si.product_id
    WHERE s.sale_date BETWEEN $1 AND $2
    GROUP BY pr.id, pr.name, pr.category, pr.unit, pr.hsn_code
    ORDER BY total_amount DESC
  `, [from || 'now() - interval 30 days', to || 'now()']);
  res.json(rows);
});

// Party-wise sales report
reportsRouter.get('/party-wise', async (req, res) => {
  const { from, to, type = 'customer' } = req.query;
  const rows = await query(`
    SELECT
      COALESCE(p.name, s.party_name) AS party_name,
      p.gstin,
      COUNT(s.id) AS invoice_count,
      SUM(s.grand_total) AS total_sales,
      SUM(s.amount_received) AS total_received,
      SUM(s.balance_due) AS total_pending
    FROM sales s
    LEFT JOIN parties p ON p.id = s.party_id
    WHERE s.sale_date BETWEEN $1 AND $2 AND s.status = 'confirmed'
    GROUP BY p.id, p.name, s.party_name, p.gstin
    ORDER BY total_sales DESC
  `, [from || 'now() - interval 30 days', to || 'now()']);
  res.json(rows);
});

// Vehicle-wise report
reportsRouter.get('/vehicle-wise', async (req, res) => {
  const { from, to } = req.query;
  const rows = await query(`
    SELECT
      COALESCE(v.registration_number, s.vehicle_number) AS vehicle_number,
      v.vehicle_type,
      COUNT(s.id) AS trip_count,
      SUM(si.quantity) AS total_quantity,
      SUM(s.grand_total) AS total_amount
    FROM sales s
    LEFT JOIN vehicles v ON v.id = s.vehicle_id
    LEFT JOIN sale_items si ON si.sale_id = s.id
    WHERE s.sale_date BETWEEN $1 AND $2 AND s.status = 'confirmed'
    GROUP BY v.id, v.registration_number, s.vehicle_number, v.vehicle_type
    ORDER BY trip_count DESC
  `, [from, to]);
  res.json(rows);
});

// GST summary (GSTR-1 style)
reportsRouter.get('/gst-summary', async (req, res) => {
  const { from, to } = req.query;
  const rows = await query(`
    SELECT
      DATE_TRUNC('month', sale_date) AS month,
      invoice_type,
      COUNT(*) AS invoice_count,
      SUM(taxable_amount) AS taxable_amount,
      SUM(cgst_amount) AS cgst,
      SUM(sgst_amount) AS sgst,
      SUM(igst_amount) AS igst,
      SUM(total_tax) AS total_tax,
      SUM(grand_total) AS grand_total
    FROM sales
    WHERE sale_date BETWEEN $1 AND $2 AND status = 'confirmed'
    GROUP BY DATE_TRUNC('month', sale_date), invoice_type
    ORDER BY month
  `, [from, to]);
  res.json(rows);
});

// Monthly trend
reportsRouter.get('/monthly-trend', async (req, res) => {
  const rows = await query(`
    SELECT
      TO_CHAR(DATE_TRUNC('month', sale_date), 'Mon YYYY') AS month,
      DATE_TRUNC('month', sale_date) AS month_date,
      SUM(grand_total) AS total_sales,
      COUNT(*) AS invoice_count
    FROM sales
    WHERE sale_date >= now() - interval '12 months' AND status = 'confirmed'
    GROUP BY DATE_TRUNC('month', sale_date)
    ORDER BY month_date
  `);
  res.json(rows);
});

// Ledger report for a party
reportsRouter.get('/ledger/:party_id', async (req, res) => {
  const { from, to } = req.query;
  const transactions = await query(`
    SELECT 'sale' as type, invoice_number as ref, sale_date as date,
      grand_total as debit, amount_received as credit, balance_due as balance
    FROM sales WHERE party_id = $1 AND sale_date BETWEEN $2 AND $3 AND status = 'confirmed'
    UNION ALL
    SELECT 'receipt' as type, payment_reference as ref, txn_date as date,
      0 as debit, amount as credit, 0 as balance
    FROM ledger_transactions WHERE party_id = $1 AND txn_date BETWEEN $2 AND $3 AND txn_type = 'receipt'
    ORDER BY date
  `, [req.params.party_id, from, to]);
  res.json(transactions);
});

// Dashboard KPIs
reportsRouter.get('/dashboard', async (req, res) => {
  const [sales, purchases, pending, topProducts] = await Promise.all([
    query(`SELECT SUM(grand_total) as total, COUNT(*) as count FROM sales WHERE sale_date = CURRENT_DATE AND status='confirmed'`),
    query(`SELECT SUM(grand_total) as total FROM purchases WHERE purchase_date = CURRENT_DATE`),
    query(`SELECT SUM(balance_due) as total FROM sales WHERE status='confirmed'`),
    query(`
      SELECT pr.name, SUM(si.quantity) as qty, SUM(si.total_amount) as amount
      FROM sale_items si JOIN products pr ON pr.id = si.product_id
      JOIN sales s ON s.id = si.sale_id AND s.status='confirmed'
      WHERE s.sale_date >= now() - interval '30 days'
      GROUP BY pr.name ORDER BY amount DESC LIMIT 5
    `),
  ]);
  res.json({
    today_sales: sales[0],
    today_purchases: purchases[0],
    total_pending: pending[0],
    top_products: topProducts,
  });
});
