import { Router } from 'express';
import { query, queryOne } from '../config/db';
import { authenticate, authorize, requireCrusher } from '../middleware/auth';
import { fanOut } from '../services/notifyService';
import { generateQuarryInvoiceNumber } from '../utils/invoiceNumber';
import { logger, logAction } from '../utils/logger';

export const quarryRouter = Router();
quarryRouter.use(authenticate);
quarryRouter.use(requireCrusher);
quarryRouter.get('/', authorize('admin', 'operations', 'report_viewer'), async (req, res) => {
  const cid = req.user!.crusher_id!;
  const { from, to, page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  const rows = await query(
    `SELECT qs.*, u.name as created_by_name FROM quarry_sales qs
     LEFT JOIN users u ON u.id = qs.created_by
     WHERE qs.sale_date BETWEEN $1 AND $2 AND qs.crusher_id = $3
     ORDER BY sale_date DESC LIMIT $4 OFFSET $5`,
    [from || 'now()-interval 30 days', to || 'now()', cid, Number(limit), offset]
  );
  res.json(rows);
});

quarryRouter.post('/', authorize('admin', 'operations'), async (req, res) => {
  const cid = req.user!.crusher_id!;
  const client = await (await import('../config/db')).pool.connect();
  try {
    await client.query('BEGIN');
    const {
      sale_date, party_id, party_name, vehicle_id, vehicle_number,
      product_id, product_name, quantity, unit, rate, royalty_rate = 0,
      amount_received = 0, payment_mode, notes
    } = req.body;
    const invoice_number = await generateQuarryInvoiceNumber(client, cid);
    const amount = quantity * rate;
    const royalty_amount = quantity * royalty_rate;
    const grand_total = amount + royalty_amount;
    const qs = await client.query(
      `INSERT INTO quarry_sales (invoice_number, sale_date, party_id, party_name,
        vehicle_id, vehicle_number, product_id, product_name, quantity, unit, rate,
        amount, royalty_rate, royalty_amount, grand_total, amount_received, payment_mode, notes, created_by, crusher_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) RETURNING *`,
      [invoice_number, sale_date, party_id, party_name, vehicle_id, vehicle_number,
       product_id, product_name, quantity, unit, rate, amount, royalty_rate, royalty_amount,
       grand_total, amount_received, payment_mode, notes, req.user!.id, cid]
    );
    await client.query('COMMIT');
    logAction('quarry_sale.created', { invoice: invoice_number, party: party_name, product: product_name, quantity, amount: grand_total, by: req.user!.email, crusher_id: cid });

    // Real-time SSE fan-out (fire-and-forget)
    fanOut(cid, {
      type: 'quarry',
      title: `Quarry Entry — ${product_name}`,
      body: `${quantity} ${unit} · ₹${grand_total.toLocaleString('en-IN')}`,
      reference_id: qs.rows[0].id,
    }).catch(() => {});

    res.status(201).json(qs.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    logAction('quarry_sale.create.failed', { error: String(err), by: req.user!.email, crusher_id: cid }, 'error');
    res.status(500).json({ error: 'Failed' });
  } finally {
    client.release();
  }
});

// ── Quarry Purchases ─────────────────────────────────────────────────────────
quarryRouter.get('/purchases', authorize('admin', 'operations', 'report_viewer'), async (req, res) => {
  try {
    const cid = req.user!.crusher_id!;
    const { from, to, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const fromDate = (from as string) || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const toDate = (to as string) || new Date().toISOString().slice(0, 10);
    const rows = await query(
      `SELECT qp.*, u.name as created_by_name FROM quarry_purchases qp
       LEFT JOIN users u ON u.id = qp.created_by
       WHERE qp.purchase_date BETWEEN $1 AND $2 AND qp.crusher_id = $3
       ORDER BY purchase_date DESC LIMIT $4 OFFSET $5`,
      [fromDate, toDate, cid, Number(limit), offset]
    );
    res.json(rows);
  } catch (err) {
    logger.error(err, 'quarry purchases fetch error');
    res.status(500).json({ error: 'Server error' });
  }
});

quarryRouter.post('/purchases', authorize('admin', 'operations'), async (req, res) => {
  const cid = req.user!.crusher_id!;
  try {
    const {
      purchase_date, supplier_name, product_name, quantity, unit = 'MT',
      rate, royalty_rate = 0, vehicle_number, payment_mode = 'cash', notes,
    } = req.body;
    if (!purchase_date || !supplier_name || !product_name || !quantity || rate === undefined) {
      return res.status(400).json({ error: 'purchase_date, supplier_name, product_name, quantity, rate are required' });
    }
    const rows = await query(
      `INSERT INTO quarry_purchases
         (purchase_date, supplier_name, product_name, quantity, unit, rate, royalty_rate,
          vehicle_number, payment_mode, notes, created_by, crusher_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [purchase_date, supplier_name, product_name, Number(quantity), unit,
       Number(rate), Number(royalty_rate), vehicle_number || null, payment_mode,
       notes || null, req.user!.id, cid]
    );
    logAction('quarry_purchase.created', { supplier: supplier_name, product: product_name, quantity, by: req.user!.email, crusher_id: cid });
    res.status(201).json((rows as any[])[0]);
  } catch (err) {
    logger.error(err, 'quarry purchase create error');
    res.status(500).json({ error: 'Failed to record purchase' });
  }
});

quarryRouter.get('/summary', authorize('admin', 'operations', 'report_viewer'), async (req, res) => {
  const cid = req.user!.crusher_id!;
  const { from, to } = req.query;
  const rows = await query(
    `SELECT product_name, SUM(quantity) as total_qty, SUM(grand_total) as total_amount,
     COUNT(*) as trips FROM quarry_sales
     WHERE sale_date BETWEEN $1 AND $2 AND crusher_id = $3
     GROUP BY product_name ORDER BY total_amount DESC`,
    [from || 'now()-interval 30 days', to || 'now()', cid]
  );
  res.json(rows);
});
