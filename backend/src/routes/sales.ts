import { Router } from 'express';
import { query, queryOne } from '../config/db';
import { authenticate, authorize, requireCrusher } from '../middleware/auth';
import { sendSaleNotification } from '../services/notifications';
import { fanOut } from '../services/notifyService';
import { generateInvoiceNumber } from '../utils/invoiceNumber';
import { logger, logAction } from '../utils/logger';

export const salesRouter = Router();
salesRouter.use(authenticate);
salesRouter.use(requireCrusher);

// List sales
salesRouter.get('/', async (req, res) => {
  const cid = req.user!.crusher_id!;
  const { from, to, party_id, status, page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  let where = 'WHERE 1=1';
  const params: any[] = [];
  params.push(cid); where += ` AND s.crusher_id = $${params.length}`;
  if (from) { params.push(from); where += ` AND sale_date >= $${params.length}`; }
  if (to) { params.push(to); where += ` AND sale_date <= $${params.length}`; }
  if (party_id) { params.push(party_id); where += ` AND party_id = $${params.length}`; }
  if (status) { params.push(status); where += ` AND status = $${params.length}`; }

  params.push(Number(limit), offset);
  const rows = await query(
    `SELECT s.*, u.name as created_by_name FROM sales s
     LEFT JOIN users u ON u.id = s.created_by
     ${where} ORDER BY sale_date DESC, created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  res.json(rows);
});

// Get single sale with items
salesRouter.get('/:id', async (req, res) => {
  const cid = req.user!.crusher_id!;
  const sale = await queryOne('SELECT * FROM sales WHERE id = $1 AND crusher_id = $2', [req.params.id, cid]);
  if (!sale) return res.status(404).json({ error: 'Not found' });
  const items = await query('SELECT * FROM sale_items WHERE sale_id = $1 ORDER BY sort_order', [req.params.id]);
  res.json({ ...sale, items });
});

// Create sale
salesRouter.post('/', authorize('admin', 'operations'), async (req, res) => {
  const cid = req.user!.crusher_id!;
  const client = await (await import('../config/db')).pool.connect();
  try {
    await client.query('BEGIN');
    const {
      invoice_type, sale_date, party_id, party_name, party_gstin, party_address,
      vehicle_id, vehicle_number, driver_name, do_number,
      items, discount_amount = 0, amount_received = 0, payment_mode, payment_reference,
      notes, is_same_state = true
    } = req.body;

    const invoice_number = await generateInvoiceNumber(client, cid);

    let subtotal = 0, total_tax = 0;
    for (const item of items) {
      subtotal += item.quantity * item.rate;
    }
    const taxable_amount = subtotal - discount_amount;

    const processedItems = items.map((item: any) => {
      const amount = item.quantity * item.rate;
      let cgst = 0, sgst = 0, igst = 0;
      if (invoice_type === 'tax_invoice') {
        if (is_same_state) {
          cgst = (amount * (item.gst_rate / 2)) / 100;
          sgst = (amount * (item.gst_rate / 2)) / 100;
        } else {
          igst = (amount * item.gst_rate) / 100;
        }
      }
      total_tax += cgst + sgst + igst;
      return { ...item, amount, cgst_amount: cgst, sgst_amount: sgst, igst_amount: igst, total_amount: amount + cgst + sgst + igst };
    });

    const grand_total = taxable_amount + total_tax;
    const balance_due = grand_total - amount_received;

    const { rows: [sale] } = await client.query(
      `INSERT INTO sales (invoice_number, invoice_type, sale_date, party_id, party_name,
        party_gstin, party_address, vehicle_id, vehicle_number, driver_name, do_number,
        subtotal, discount_amount, taxable_amount, cgst_amount, sgst_amount, igst_amount,
        total_tax, grand_total, amount_received, payment_mode, payment_reference,
        balance_due, notes, created_by, crusher_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26)
       RETURNING *`,
      [invoice_number, invoice_type || 'tax_invoice', sale_date, party_id, party_name,
       party_gstin, party_address, vehicle_id, vehicle_number, driver_name, do_number,
       subtotal, discount_amount, taxable_amount,
       processedItems.reduce((s: number, i: any) => s + i.cgst_amount, 0),
       processedItems.reduce((s: number, i: any) => s + i.sgst_amount, 0),
       processedItems.reduce((s: number, i: any) => s + i.igst_amount, 0),
       total_tax, grand_total, amount_received, payment_mode, payment_reference,
       balance_due, notes, req.user!.id, cid]
    );

    for (let idx = 0; idx < processedItems.length; idx++) {
      const it = processedItems[idx];
      await client.query(
        `INSERT INTO sale_items (sale_id, product_id, product_name, hsn_code, unit, quantity, rate,
          amount, gst_rate, cgst_rate, sgst_rate, igst_rate, cgst_amount, sgst_amount, igst_amount,
          total_amount, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
        [sale.id, it.product_id, it.product_name, it.hsn_code, it.unit,
         it.quantity, it.rate, it.amount, it.gst_rate,
         is_same_state ? it.gst_rate / 2 : 0,
         is_same_state ? it.gst_rate / 2 : 0,
         is_same_state ? 0 : it.gst_rate,
         it.cgst_amount, it.sgst_amount, it.igst_amount, it.total_amount, idx]
      );
    }

    await client.query('COMMIT');
    const created = sale;

    // Send push notification async
    sendSaleNotification(created).catch(console.error);

    // Real-time SSE fan-out (fire-and-forget)
    fanOut(cid, {
      type: 'sale',
      title: `New Sale — ${invoice_number}`,
      body: `₹${grand_total.toLocaleString('en-IN')} · ${party_name} · ${processedItems.length} item(s)`,
      reference_id: created.id,
      metadata: { amount: grand_total, party: party_name },
    }).catch(() => {});

    logAction('sale.created', { invoice: invoice_number, party: party_name, amount: grand_total, items: processedItems.length, by: req.user!.email, crusher_id: cid });
    res.status(201).json({ ...created, items: processedItems });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    logAction('sale.create.failed', { error: String(err), by: req.user!.email, crusher_id: cid }, 'error');
    res.status(500).json({ error: 'Failed to create sale' });
  } finally {
    client.release();
  }
});

// Cancel sale
salesRouter.patch('/:id/cancel', authorize('admin', 'operations'), async (req, res) => {
  const cid = req.user!.crusher_id!;
  const sale = await queryOne(
    "UPDATE sales SET status = 'cancelled', updated_at = now() WHERE id = $1 AND crusher_id = $2 AND status != 'cancelled' RETURNING *",
    [req.params.id, cid]
  );
  if (!sale) return res.status(404).json({ error: 'Not found or already cancelled' });
  logAction('sale.cancelled', { saleId: req.params.id, by: req.user!.email, crusher_id: cid }, 'warn');
  res.json(sale);
});

// Dashboard summary
salesRouter.get('/summary/today', async (req, res) => {
  const cid = req.user!.crusher_id!;
  const rows = await query(`
    SELECT
      COUNT(*) as invoice_count,
      SUM(grand_total) as total_sales,
      SUM(amount_received) as total_received,
      SUM(balance_due) as total_pending
    FROM sales
    WHERE sale_date = CURRENT_DATE AND status = 'confirmed' AND crusher_id = $1
  `, [cid]);
  res.json(rows[0]);
});
