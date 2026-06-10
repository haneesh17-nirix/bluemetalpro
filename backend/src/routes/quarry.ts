import { Router } from 'express';
import { query, queryOne } from '../config/db';
import { authenticate, authorize, requireCrusher } from '../middleware/auth';
import { fanOut } from '../services/notifyService';
import { generateQuarryInvoiceNumber } from '../utils/invoiceNumber';
import { logger, logAction } from '../utils/logger';

export const quarryRouter = Router();
quarryRouter.use(authenticate);
quarryRouter.use(requireCrusher);
quarryRouter.use(authorize('admin', 'quarry_operator', 'accounts'));

quarryRouter.get('/', async (req, res) => {
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

quarryRouter.post('/', async (req, res) => {
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

quarryRouter.get('/summary', async (req, res) => {
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
