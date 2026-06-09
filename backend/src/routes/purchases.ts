import { Router } from 'express';
import { query, queryOne } from '../config/db';
import { authenticate, authorize, requireCrusher } from '../middleware/auth';
import { logger, logAction } from '../utils/logger';

export const purchasesRouter = Router();
purchasesRouter.use(authenticate);
purchasesRouter.use(requireCrusher);
purchasesRouter.use(authorize('admin', 'sales_operator', 'accounts'));

purchasesRouter.get('/', async (req, res) => {
  const cid = req.user!.crusher_id!;
  const { from, to, party_id, page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  let where = 'WHERE 1=1';
  const params: any[] = [];
  params.push(cid); where += ` AND crusher_id = $${params.length}`;
  if (from) { params.push(from); where += ` AND purchase_date >= $${params.length}`; }
  if (to) { params.push(to); where += ` AND purchase_date <= $${params.length}`; }
  if (party_id) { params.push(party_id); where += ` AND party_id = $${params.length}`; }
  params.push(Number(limit), offset);
  const rows = await query(
    `SELECT * FROM purchases ${where} ORDER BY purchase_date DESC LIMIT $${params.length-1} OFFSET $${params.length}`,
    params
  );
  res.json(rows);
});

purchasesRouter.post('/', async (req, res) => {
  const cid = req.user!.crusher_id!;
  const client = await (await import('../config/db')).pool.connect();
  try {
    await client.query('BEGIN');
    const { bill_number, purchase_date, party_id, party_name, vehicle_id, vehicle_number, items, amount_paid = 0, payment_mode, notes } = req.body;
    let subtotal = 0;
    for (const item of items) subtotal += item.quantity * item.rate;
    const grand_total = items.reduce((s: number, i: any) => s + (i.quantity * i.rate * (1 + (i.gst_rate || 0) / 100)), 0);
    const p = await client.query(
      `INSERT INTO purchases (bill_number, purchase_date, party_id, party_name, vehicle_id, vehicle_number,
        subtotal, grand_total, amount_paid, payment_mode, balance_due, notes, created_by, crusher_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [bill_number, purchase_date, party_id, party_name, vehicle_id, vehicle_number,
       subtotal, grand_total, amount_paid, payment_mode, grand_total - amount_paid, notes, req.user!.id, cid]
    );
    for (const item of items) {
      const amount = item.quantity * item.rate;
      const gst = amount * (item.gst_rate || 0) / 100;
      await client.query(
        `INSERT INTO purchase_items (purchase_id, product_id, product_name, unit, quantity, rate, amount, gst_rate, total_amount)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [p.rows[0].id, item.product_id, item.product_name, item.unit, item.quantity, item.rate, amount, item.gst_rate || 0, amount + gst]
      );
    }
    await client.query('COMMIT');
    logAction('purchase.created', { bill: bill_number, party: party_name, amount: grand_total, items: items.length, by: req.user!.email, crusher_id: cid });
    res.status(201).json(p.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    logAction('purchase.create.failed', { error: String(err), by: req.user!.email, crusher_id: cid }, 'error');
    res.status(500).json({ error: 'Failed' });
  } finally {
    client.release();
  }
});

purchasesRouter.get('/:id', async (req, res) => {
  const cid = req.user!.crusher_id!;
  const purchase = await queryOne('SELECT * FROM purchases WHERE id = $1 AND crusher_id = $2', [req.params.id, cid]);
  if (!purchase) return res.status(404).json({ error: 'Not found' });
  const items = await query('SELECT * FROM purchase_items WHERE purchase_id = $1', [req.params.id]);
  res.json({ ...purchase, items });
});

purchasesRouter.put('/:id', async (req, res) => {
  const cid = req.user!.crusher_id!;
  const { amount_paid, payment_mode, notes } = req.body;
  const existing = await queryOne('SELECT grand_total FROM purchases WHERE id = $1 AND crusher_id = $2', [req.params.id, cid]);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const balance_due = (existing as any).grand_total - amount_paid;
  const updated = await queryOne(
    `UPDATE purchases SET amount_paid=$1, payment_mode=$2, notes=$3, balance_due=$4
     WHERE id=$5 AND crusher_id=$6 RETURNING *`,
    [amount_paid, payment_mode, notes, balance_due, req.params.id, cid]
  );
  logAction('purchase.updated', { purchaseId: req.params.id, by: req.user!.email, crusher_id: cid });
  res.json(updated);
});
