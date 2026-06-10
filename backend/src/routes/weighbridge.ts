import { Router } from 'express';
import { query, queryOne } from '../config/db';
import { authenticate, authorize } from '../middleware/auth';
import type { EdgeWeightPayload } from '../../../packages/shared/src/types/weighbridge';

export const weighbridgeRouter = Router();

// ─── Edge agent ingest (no JWT — uses API key auth) ─────────────────────────
weighbridgeRouter.post('/ingest', async (req, res) => {
  const payload = req.body as EdgeWeightPayload;

  // Validate API key against weighbridge config in DB
  const wb = await queryOne(
    'SELECT * FROM weighbridges WHERE id = $1 AND api_key = $2 AND is_active = true',
    [payload.weighbridgeId, payload.apiKey]
  );
  if (!wb) return res.status(401).json({ error: 'Invalid weighbridge credentials' });

  // Upsert live weight (one row per weighbridge = current state)
  await query(
    `INSERT INTO weighbridge_live (weighbridge_id, weight_kg, status, raw_string, vehicle_number, captured_at)
     VALUES ($1, $2, $3, $4, $5, now())
     ON CONFLICT (weighbridge_id) DO UPDATE
       SET weight_kg = EXCLUDED.weight_kg,
           status = EXCLUDED.status,
           raw_string = EXCLUDED.raw_string,
           vehicle_number = EXCLUDED.vehicle_number,
           captured_at = EXCLUDED.captured_at`,
    [payload.weighbridgeId, payload.weight.value, payload.weight.status, payload.weight.raw, payload.vehicleNumber || null]
  );

  res.json({ success: true });
});

// ─── All routes below require JWT ───────────────────────────────────────────
weighbridgeRouter.use(authenticate);

// List weighbridges
weighbridgeRouter.get('/', async (req, res) => {
  const rows = await query(
    `SELECT w.*, wl.weight_kg, wl.status as live_status, wl.vehicle_number, wl.captured_at
     FROM weighbridges w
     LEFT JOIN weighbridge_live wl ON wl.weighbridge_id = w.id
     WHERE w.is_active = true ORDER BY w.sort_order`
  );
  res.json(rows);
});

// Weigh tickets list
weighbridgeRouter.get('/tickets', async (req, res) => {
  const { from, to, weighbridge_id, page = 1, limit = 30 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  let where = 'WHERE 1=1';
  const params: any[] = [];
  if (from) { params.push(from); where += ` AND t.created_at >= $${params.length}`; }
  if (to) { params.push(to); where += ` AND t.created_at <= $${params.length}`; }
  if (weighbridge_id) { params.push(weighbridge_id); where += ` AND t.weighbridge_id = $${params.length}`; }
  params.push(Number(limit), offset);

  const rows = await query(
    `SELECT t.*, w.name as weighbridge_name, u.name as operator_name
     FROM weigh_tickets t
     LEFT JOIN weighbridges w ON w.id = t.weighbridge_id
     LEFT JOIN users u ON u.id = t.operator_id
     ${where} ORDER BY t.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  res.json(rows);
});

// Create weigh ticket (gross in)
weighbridgeRouter.post('/tickets', authorize('admin', 'operations'), async (req, res) => {
  const {
    weighbridge_id, vehicle_id, vehicle_number,
    party_id, party_name, product_id, product_name,
    gross_weight_kg, tare_weight_kg, notes
  } = req.body;

  const net_weight_kg = Math.max(0, Number(gross_weight_kg) - Number(tare_weight_kg || 0));
  const net_weight_mt = +(net_weight_kg / 1000).toFixed(3);

  // Generate ticket number
  const counterRow = await queryOne(
    `UPDATE company_config SET weighbridge_ticket_counter = COALESCE(weighbridge_ticket_counter, 0) + 1
     RETURNING weighbridge_ticket_counter, EXTRACT(YEAR FROM now()) as year, EXTRACT(MONTH FROM now()) as month`
  );
  const { weighbridge_ticket_counter, year, month } = counterRow as any;
  const fy = Number(month) >= 4
    ? `${String(year).slice(2)}${String(Number(year) + 1).slice(2)}`
    : `${String(Number(year) - 1).slice(2)}${String(year).slice(2)}`;
  const ticketNumber = `WT/${fy}/${String(weighbridge_ticket_counter).padStart(4, '0')}`;

  const ticket = await queryOne(
    `INSERT INTO weigh_tickets (
       ticket_number, weighbridge_id, vehicle_id, vehicle_number,
       party_id, party_name, product_id, product_name,
       gross_weight_kg, tare_weight_kg, net_weight_kg, net_weight_mt,
       operator_id, notes
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
    [ticketNumber, weighbridge_id, vehicle_id, vehicle_number,
     party_id, party_name, product_id, product_name,
     gross_weight_kg, tare_weight_kg || 0, net_weight_kg, net_weight_mt,
     req.user!.id, notes]
  );
  res.status(201).json(ticket);
});

// Link ticket to sale
weighbridgeRouter.patch('/tickets/:id/link-sale', authorize('admin', 'operations'), async (req, res) => {
  const ticket = await queryOne(
    'UPDATE weigh_tickets SET sale_id = $1, updated_at = now() WHERE id = $2 RETURNING *',
    [req.body.sale_id, req.params.id]
  );
  res.json(ticket);
});

// Get live weight from a weighbridge
weighbridgeRouter.get('/:id/live', async (req, res) => {
  const live = await queryOne(
    'SELECT * FROM weighbridge_live WHERE weighbridge_id = $1',
    [req.params.id]
  );
  res.json(live || { weight_kg: 0, status: 'unknown' });
});

// Admin — add weighbridge
weighbridgeRouter.post('/', authorize('admin'), async (req, res) => {
  const { name, type, com_port, baud_rate, ip_address, ip_port, max_capacity_kg, location_label, sort_order } = req.body;
  const apiKey = require('crypto').randomBytes(32).toString('hex');
  const wb = await queryOne(
    `INSERT INTO weighbridges (name, type, com_port, baud_rate, ip_address, ip_port, max_capacity_kg, location_label, sort_order, api_key)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [name, type || 'serial', com_port, baud_rate || 9600, ip_address, ip_port, max_capacity_kg || 60000, location_label, sort_order || 0, apiKey]
  );
  res.status(201).json(wb);
});
