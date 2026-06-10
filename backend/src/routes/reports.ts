import { Router } from 'express';
import { query } from '../config/db';
import { authenticate, authorize, requireCrusher } from '../middleware/auth';
import { logger, logAction } from '../utils/logger';

export const reportsRouter = Router();
reportsRouter.use(authenticate);
reportsRouter.use(requireCrusher);
reportsRouter.use(authorize('admin', 'report_viewer', 'accounts'));

// Item-wise sales report
reportsRouter.get('/item-wise', async (req, res) => {
  const cid = req.user!.crusher_id!;
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
    WHERE s.sale_date BETWEEN $1 AND $2 AND s.crusher_id = $3
    GROUP BY pr.id, pr.name, pr.category, pr.unit, pr.hsn_code
    ORDER BY total_amount DESC
  `, [from || 'now() - interval 30 days', to || 'now()', cid]);
  logAction('reports.item_wise_viewed', { from: String(req.query.from || ''), to: String(req.query.to || ''), by: req.user!.email });
  res.json(rows);
});

// Party-wise sales report
reportsRouter.get('/party-wise', async (req, res) => {
  const cid = req.user!.crusher_id!;
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
    WHERE s.sale_date BETWEEN $1 AND $2 AND s.status = 'confirmed' AND s.crusher_id = $3
    GROUP BY p.id, p.name, s.party_name, p.gstin
    ORDER BY total_sales DESC
  `, [from || 'now() - interval 30 days', to || 'now()', cid]);
  logAction('reports.party_wise_viewed', { from: String(req.query.from || ''), to: String(req.query.to || ''), by: req.user!.email });
  res.json(rows);
});

// Vehicle-wise report
reportsRouter.get('/vehicle-wise', async (req, res) => {
  const cid = req.user!.crusher_id!;
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
    WHERE s.sale_date BETWEEN $1 AND $2 AND s.status = 'confirmed' AND s.crusher_id = $3
    GROUP BY v.id, v.registration_number, s.vehicle_number, v.vehicle_type
    ORDER BY trip_count DESC
  `, [from, to, cid]);
  res.json(rows);
});

// GST summary (GSTR-1 style)
reportsRouter.get('/gst-summary', async (req, res) => {
  const cid = req.user!.crusher_id!;
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
    WHERE sale_date BETWEEN $1 AND $2 AND status = 'confirmed' AND crusher_id = $3
    GROUP BY DATE_TRUNC('month', sale_date), invoice_type
    ORDER BY month
  `, [from, to, cid]);
  logAction('reports.gst_summary_viewed', { from: String(req.query.from || ''), to: String(req.query.to || ''), by: req.user!.email });
  res.json(rows);
});

// Monthly trend
reportsRouter.get('/monthly-trend', async (req, res) => {
  const cid = req.user!.crusher_id!;
  const rows = await query(`
    SELECT
      TO_CHAR(DATE_TRUNC('month', sale_date), 'Mon YYYY') AS month,
      DATE_TRUNC('month', sale_date) AS month_date,
      SUM(grand_total) AS total_sales,
      COUNT(*) AS invoice_count
    FROM sales
    WHERE sale_date >= now() - interval '12 months' AND status = 'confirmed' AND crusher_id = $1
    GROUP BY DATE_TRUNC('month', sale_date)
    ORDER BY month_date
  `, [cid]);
  res.json(rows);
});

// Ledger report for a party
reportsRouter.get('/ledger/:party_id', async (req, res) => {
  const cid = req.user!.crusher_id!;
  const { from, to } = req.query;
  const transactions = await query(`
    SELECT 'sale' as type, invoice_number as ref, sale_date as date,
      grand_total as debit, amount_received as credit, balance_due as balance
    FROM sales WHERE party_id = $1 AND sale_date BETWEEN $2 AND $3 AND status = 'confirmed' AND crusher_id = $4
    UNION ALL
    SELECT 'receipt' as type, payment_reference as ref, txn_date as date,
      0 as debit, amount as credit, 0 as balance
    FROM ledger_transactions WHERE party_id = $1 AND txn_date BETWEEN $2 AND $3 AND txn_type = 'receipt' AND crusher_id = $4
    ORDER BY date
  `, [req.params.party_id, from, to, cid]);
  res.json(transactions);
});

// P&L / Opex report — monthly breakdown of revenue vs costs
reportsRouter.get('/pl', async (req, res) => {
  const cid = req.user!.crusher_id!;
  const { from, to } = req.query;
  const f = from || `${new Date().getFullYear()}-04-01`;   // default: financial year start
  const t = to   || new Date().toISOString().split('T')[0];

  const [revenue, quarryRevenue, purchases, wages, maintenance, opex, monthly] = await Promise.all([

    // Revenue from crusher sales
    query(`
      SELECT
        COALESCE(SUM(subtotal), 0)        AS revenue_ex_gst,
        COALESCE(SUM(total_tax), 0)       AS gst_collected,
        COALESCE(SUM(grand_total), 0)     AS revenue_with_gst,
        COALESCE(SUM(amount_received), 0) AS cash_received,
        COALESCE(SUM(balance_due), 0)     AS outstanding
      FROM sales
      WHERE sale_date BETWEEN $1 AND $2
        AND status = 'confirmed'
        AND crusher_id = $3
    `, [f, t, cid]),

    // Revenue from quarry sales
    query(`
      SELECT
        COALESCE(SUM(amount), 0)        AS quarry_revenue,
        COALESCE(SUM(royalty_amount), 0) AS royalty_paid,
        COALESCE(SUM(grand_total), 0)   AS quarry_gross
      FROM quarry_sales
      WHERE sale_date BETWEEN $1 AND $2 AND crusher_id = $3
    `, [f, t, cid]),

    // Raw material / purchase cost
    query(`
      SELECT
        COALESCE(SUM(subtotal), 0)    AS purchase_ex_gst,
        COALESCE(SUM(grand_total), 0) AS purchase_with_gst,
        COUNT(*)                      AS purchase_count
      FROM purchases
      WHERE purchase_date BETWEEN $1 AND $2 AND crusher_id = $3
    `, [f, t, cid]),

    // Wages cost
    query(`
      SELECT
        COALESCE(SUM(gross_wages), 0)   AS gross_wages,
        COALESCE(SUM(deductions), 0)    AS deductions,
        COALESCE(SUM(net_wages), 0)     AS net_wages,
        COUNT(DISTINCT worker_id)       AS worker_count
      FROM wage_payments
      WHERE payment_date BETWEEN $1 AND $2 AND crusher_id = $3
    `, [f, t, cid]),

    // Maintenance cost
    query(`
      SELECT
        COALESCE(SUM(cost), 0) AS maintenance_cost,
        COUNT(*)               AS job_count
      FROM maintenance_records
      WHERE completed_date BETWEEN $1 AND $2 AND status = 'completed' AND crusher_id = $3
    `, [f, t, cid]),

    // Opex — journal entries in ledger (electricity, diesel, misc)
    query(`
      SELECT
        COALESCE(SUM(amount), 0) AS opex_total,
        COUNT(*)                 AS entry_count,
        json_agg(
          json_build_object(
            'date',    txn_date,
            'narration', narration,
            'amount',  amount,
            'mode',    payment_mode
          ) ORDER BY txn_date
        ) AS entries
      FROM ledger_transactions
      WHERE txn_date BETWEEN $1 AND $2
        AND txn_type = 'journal'
        AND crusher_id = $3
    `, [f, t, cid]),

    // Monthly P&L breakdown
    query(`
      WITH months AS (
        SELECT generate_series(
          DATE_TRUNC('month', $1::date),
          DATE_TRUNC('month', $2::date),
          '1 month'::interval
        ) AS m
      ),
      rev AS (
        SELECT DATE_TRUNC('month', sale_date) AS m,
          SUM(subtotal) AS sales_revenue, SUM(total_tax) AS gst_collected
        FROM sales
        WHERE sale_date BETWEEN $1 AND $2 AND status='confirmed' AND crusher_id=$3
        GROUP BY 1
      ),
      qrev AS (
        SELECT DATE_TRUNC('month', sale_date) AS m,
          SUM(amount) AS quarry_revenue
        FROM quarry_sales
        WHERE sale_date BETWEEN $1 AND $2 AND crusher_id=$3
        GROUP BY 1
      ),
      pur AS (
        SELECT DATE_TRUNC('month', purchase_date) AS m,
          SUM(subtotal) AS purchase_cost
        FROM purchases
        WHERE purchase_date BETWEEN $1 AND $2 AND crusher_id=$3
        GROUP BY 1
      ),
      wag AS (
        SELECT DATE_TRUNC('month', payment_date) AS m,
          SUM(gross_wages) AS wages
        FROM wage_payments
        WHERE payment_date BETWEEN $1 AND $2 AND crusher_id=$3
        GROUP BY 1
      ),
      mnt AS (
        SELECT DATE_TRUNC('month', completed_date) AS m,
          SUM(cost) AS maint_cost
        FROM maintenance_records
        WHERE completed_date BETWEEN $1 AND $2 AND status='completed' AND crusher_id=$3
        GROUP BY 1
      ),
      opx AS (
        SELECT DATE_TRUNC('month', txn_date) AS m,
          SUM(amount) AS opex
        FROM ledger_transactions
        WHERE txn_date BETWEEN $1 AND $2 AND txn_type='journal' AND crusher_id=$3
        GROUP BY 1
      )
      SELECT
        TO_CHAR(months.m, 'Mon YYYY')                   AS month,
        months.m                                         AS month_date,
        COALESCE(rev.sales_revenue, 0)                  AS sales_revenue,
        COALESCE(qrev.quarry_revenue, 0)                AS quarry_revenue,
        COALESCE(rev.sales_revenue,0)
          + COALESCE(qrev.quarry_revenue,0)             AS total_revenue,
        COALESCE(pur.purchase_cost, 0)                  AS purchase_cost,
        COALESCE(wag.wages, 0)                          AS wages,
        COALESCE(mnt.maint_cost, 0)                     AS maintenance_cost,
        COALESCE(opx.opex, 0)                           AS opex,
        COALESCE(pur.purchase_cost,0)
          + COALESCE(wag.wages,0)
          + COALESCE(mnt.maint_cost,0)
          + COALESCE(opx.opex,0)                        AS total_cost,
        (COALESCE(rev.sales_revenue,0) + COALESCE(qrev.quarry_revenue,0))
          - (COALESCE(pur.purchase_cost,0) + COALESCE(wag.wages,0)
             + COALESCE(mnt.maint_cost,0) + COALESCE(opx.opex,0))
                                                         AS gross_profit,
        COALESCE(rev.gst_collected, 0)                  AS gst_collected
      FROM months
      LEFT JOIN rev   ON rev.m   = months.m
      LEFT JOIN qrev  ON qrev.m  = months.m
      LEFT JOIN pur   ON pur.m   = months.m
      LEFT JOIN wag   ON wag.m   = months.m
      LEFT JOIN mnt   ON mnt.m   = months.m
      LEFT JOIN opx   ON opx.m   = months.m
      ORDER BY months.m
    `, [f, t, cid]),
  ]);

  const r  = revenue[0]      as any;
  const qr = quarryRevenue[0] as any;
  const p  = purchases[0]    as any;
  const w  = wages[0]        as any;
  const m  = maintenance[0]  as any;
  const o  = opex[0]         as any;

  const totalRevenue  = Number(r.revenue_ex_gst)  + Number(qr.quarry_revenue);
  const totalCost     = Number(p.purchase_ex_gst) + Number(w.gross_wages)
                      + Number(m.maintenance_cost) + Number(o.opex_total);
  const grossProfit   = totalRevenue - totalCost;
  const margin        = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

  logAction('reports.pl_viewed', { from: f, to: t, by: req.user!.email });

  res.json({
    period: { from: f, to: t },
    summary: {
      total_revenue:     totalRevenue,
      sales_revenue:     Number(r.revenue_ex_gst),
      quarry_revenue:    Number(qr.quarry_revenue),
      royalty_paid:      Number(qr.royalty_paid),
      gst_collected:     Number(r.gst_collected),
      cash_received:     Number(r.cash_received),
      outstanding:       Number(r.outstanding),
      purchase_cost:     Number(p.purchase_ex_gst),
      wages_cost:        Number(w.gross_wages),
      maintenance_cost:  Number(m.maintenance_cost),
      opex_total:        Number(o.opex_total),
      total_cost:        totalCost,
      gross_profit:      grossProfit,
      gross_margin_pct:  Number(margin.toFixed(2)),
    },
    cost_breakdown: [
      { category: 'Raw Materials',  amount: Number(p.purchase_ex_gst),  pct: totalCost > 0 ? (Number(p.purchase_ex_gst)  / totalCost * 100) : 0 },
      { category: 'Wages',          amount: Number(w.gross_wages),       pct: totalCost > 0 ? (Number(w.gross_wages)       / totalCost * 100) : 0 },
      { category: 'Maintenance',    amount: Number(m.maintenance_cost),  pct: totalCost > 0 ? (Number(m.maintenance_cost)  / totalCost * 100) : 0 },
      { category: 'Opex / Overheads', amount: Number(o.opex_total),      pct: totalCost > 0 ? (Number(o.opex_total)        / totalCost * 100) : 0 },
    ],
    opex_entries: o.entries || [],
    monthly,
  });
});

// Dashboard KPIs
reportsRouter.get('/dashboard', async (req, res) => {
  const cid = req.user!.crusher_id!;
  const [sales, purchases, pending, topProducts, monthSales, monthPurchases, recentSales, yesterdaySales] = await Promise.all([
    // Today
    query(`SELECT SUM(grand_total) as total, COUNT(*) as count FROM sales WHERE sale_date = CURRENT_DATE AND status='confirmed' AND crusher_id = $1`, [cid]),
    query(`SELECT SUM(grand_total) as total FROM purchases WHERE purchase_date = CURRENT_DATE AND crusher_id = $1`, [cid]),
    // All-time receivables
    query(`SELECT SUM(balance_due) as total FROM sales WHERE status='confirmed' AND crusher_id = $1`, [cid]),
    // Top products last 30 days
    query(`
      SELECT pr.name, SUM(si.quantity) as qty, SUM(si.total_amount) as amount
      FROM sale_items si JOIN products pr ON pr.id = si.product_id
      JOIN sales s ON s.id = si.sale_id AND s.status='confirmed'
      WHERE s.sale_date >= now() - interval '30 days' AND s.crusher_id = $1
      GROUP BY pr.name ORDER BY amount DESC LIMIT 5
    `, [cid]),
    // This month totals
    query(`SELECT SUM(grand_total) as total, COUNT(*) as count FROM sales WHERE DATE_TRUNC('month', sale_date)=DATE_TRUNC('month', CURRENT_DATE) AND status='confirmed' AND crusher_id = $1`, [cid]),
    query(`SELECT SUM(grand_total) as total FROM purchases WHERE DATE_TRUNC('month', purchase_date)=DATE_TRUNC('month', CURRENT_DATE) AND crusher_id = $1`, [cid]),
    // Recent 6 sales
    query(`
      SELECT s.id, s.invoice_number, s.sale_date, s.grand_total, s.balance_due, s.status,
             s.payment_mode, COALESCE(p.name, s.party_name, 'Cash') AS party_name
      FROM sales s LEFT JOIN parties p ON p.id = s.party_id
      WHERE s.crusher_id = $1 AND s.status='confirmed'
      ORDER BY s.created_at DESC LIMIT 6
    `, [cid]),
    // Yesterday for delta
    query(`SELECT SUM(grand_total) as total, COUNT(*) as count FROM sales WHERE sale_date = CURRENT_DATE - 1 AND status='confirmed' AND crusher_id = $1`, [cid]),
  ]);
  logAction('reports.dashboard_viewed', { by: req.user!.email });
  res.json({
    today_sales: sales[0],
    today_purchases: purchases[0],
    total_pending: pending[0],
    top_products: topProducts,
    month_sales: monthSales[0],
    month_purchases: monthPurchases[0],
    recent_sales: recentSales,
    yesterday_sales: yesterdaySales[0],
  });
});
