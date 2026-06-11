import { Router } from 'express';
import { query, queryOne } from '../config/db';
import { authenticate, authorize } from '../middleware/auth';
import type { EdgeWeightPayload } from '../../../packages/shared/src/types/weighbridge';
import { fanOut } from '../services/notifyService';
import { logger, logAction } from '../utils/logger';

export const weighbridgeRouter = Router();

// ─── Edge agent ingest (no JWT — uses API key auth) ─────────────────────────
weighbridgeRouter.post('/ingest', async (req, res) => {
  const payload = req.body as EdgeWeightPayload;

  logger.debug({ weighbridgeId: payload.weighbridgeId, status: payload.weight?.status }, 'weighbridge ingest received');

  try {
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

    logAction('weighbridge.ingest', { weighbridge_id: payload.weighbridgeId, status: payload.weight.status, weight_kg: payload.weight.value, vehicle: payload.vehicleNumber || null });
    res.json({ success: true });
  } catch (err) {
    logger.error({ err, weighbridgeId: payload.weighbridgeId }, 'weighbridge ingest failed');
    return res.status(500).json({ error: 'Ingest failed' });
  }
});

// ─── All routes below require JWT ───────────────────────────────────────────
weighbridgeRouter.use(authenticate);

// List weighbridges
weighbridgeRouter.get('/', async (req, res) => {
  try {
    const rows = await query(
      `SELECT w.*, wl.weight_kg, wl.status as live_status, wl.vehicle_number, wl.captured_at
       FROM weighbridges w
       LEFT JOIN weighbridge_live wl ON wl.weighbridge_id = w.id
       WHERE w.is_active = true AND w.crusher_id = $1 ORDER BY w.sort_order`,
      [req.user!.crusher_id]
    );
    res.json(rows);
  } catch (err) {
    logger.error({ err, crusher_id: req.user!.crusher_id }, 'failed to list weighbridges');
    return res.status(500).json({ error: 'Failed to list weighbridges' });
  }
});

// Weigh tickets list
weighbridgeRouter.get('/tickets', async (req, res) => {
  try {
    const { from, to, weighbridge_id, page = 1, limit = 30 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    let where = 'WHERE 1=1';
    const params: any[] = [];
    if (from) { params.push(from); where += ` AND t.created_at >= $${params.length}`; }
    if (to) { params.push(to); where += ` AND t.created_at <= $${params.length}`; }
    if (weighbridge_id) { params.push(weighbridge_id); where += ` AND t.weighbridge_id = $${params.length}`; }
    params.push(req.user!.crusher_id);
    where += ` AND w.crusher_id = $${params.length}`;
    params.push(Number(limit), offset);

    const rows = await query(
      `SELECT t.*, w.name as weighbridge_name, u.name as operator_name
       FROM weigh_tickets t
       JOIN weighbridges w ON w.id = t.weighbridge_id
       LEFT JOIN users u ON u.id = t.operator_id
       ${where} ORDER BY t.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    res.json(rows);
  } catch (err) {
    logger.error({ err, crusher_id: req.user!.crusher_id, query: req.query }, 'failed to list weigh tickets');
    return res.status(500).json({ error: 'Failed to list weigh tickets' });
  }
});

// Create weigh ticket (gross in)
weighbridgeRouter.post('/tickets', authorize('admin', 'operations'), async (req, res) => {
  const {
    weighbridge_id, vehicle_id, vehicle_number,
    party_id, party_name, product_id, product_name,
    gross_weight_kg, tare_weight_kg, notes
  } = req.body;

  logger.debug({ weighbridge_id, vehicle_number, operator_id: req.user!.id }, 'creating weigh ticket');

  try {
    const net_weight_kg = Math.max(0, Number(gross_weight_kg) - Number(tare_weight_kg || 0));
    const net_weight_mt = +(net_weight_kg / 1000).toFixed(3);

    const wb = await queryOne('SELECT crusher_id FROM weighbridges WHERE id = $1', [weighbridge_id]);
    const crusherId = (wb as any)?.crusher_id;

    // Generate ticket number
    const counterRow = await queryOne(
      `UPDATE crushers SET weighbridge_ticket_counter = COALESCE(weighbridge_ticket_counter, 0) + 1
       WHERE id = $1
       RETURNING weighbridge_ticket_counter, EXTRACT(YEAR FROM now()) as year, EXTRACT(MONTH FROM now()) as month`,
      [crusherId]
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
    const t = ticket as any;
    if (t?.weighbridge_id) {
      const wb2 = await queryOne('SELECT crusher_id FROM weighbridges WHERE id = $1', [t.weighbridge_id]);
      if (wb2) {
        fanOut((wb2 as any).crusher_id, {
          type: 'weighbridge',
          title: 'Weigh Ticket Created',
          body: `${t.ticket_number} — ${t.vehicle_number || 'unknown vehicle'} | ${t.net_weight_mt} MT${t.party_name ? ` | ${t.party_name}` : ''}`,
          reference_id: t.id,
        });
      }
    }
    res.status(201).json(ticket);
    logAction('weigh_ticket.created', { ticket_number: ticketNumber, net_weight_mt, weighbridge_id, vehicle_number, operator_id: req.user!.id, crusher_id: req.user!.crusher_id });
  } catch (err) {
    logger.error({ err, operator_id: req.user!.id, crusher_id: req.user!.crusher_id, weighbridge_id, vehicle_number }, 'failed to create weigh ticket');
    return res.status(500).json({ error: 'Failed to create weigh ticket' });
  }
});

// Link ticket to sale
weighbridgeRouter.patch('/tickets/:id/link-sale', authorize('admin', 'operations'), async (req, res) => {
  try {
    const ticket = await queryOne(
      `UPDATE weigh_tickets wt SET sale_id = $1, updated_at = now() FROM weighbridges wb WHERE wt.id = $2 AND wt.weighbridge_id = wb.id AND wb.crusher_id = $3 RETURNING wt.*`,
      [req.body.sale_id, req.params.id, req.user!.crusher_id]
    );
    res.json(ticket);
    logAction('weigh_ticket.sale_linked', { ticket_id: req.params.id, sale_id: req.body.sale_id, crusher_id: req.user!.crusher_id, operator_id: req.user!.id });
  } catch (err) {
    logger.error({ err, ticket_id: req.params.id, sale_id: req.body.sale_id, crusher_id: req.user!.crusher_id }, 'failed to link ticket to sale');
    return res.status(500).json({ error: 'Failed to link ticket to sale' });
  }
});

// Get live weight from a weighbridge
weighbridgeRouter.get('/:id/live', async (req, res) => {
  try {
    const live = await queryOne(
      'SELECT * FROM weighbridge_live WHERE weighbridge_id = $1',
      [req.params.id]
    );
    res.json(live || { weight_kg: 0, status: 'unknown' });
  } catch (err) {
    logger.error({ err, weighbridge_id: req.params.id }, 'failed to fetch live weight');
    return res.status(500).json({ error: 'Failed to fetch live weight' });
  }
});

// Admin — add weighbridge
weighbridgeRouter.post('/', authorize('admin'), async (req, res) => {
  const { name, type, com_port, baud_rate, ip_address, ip_port, max_capacity_kg, location_label, sort_order } = req.body;
  try {
    const apiKey = require('crypto').randomBytes(32).toString('hex');
    const wb = await queryOne(
      `INSERT INTO weighbridges (name, type, com_port, baud_rate, ip_address, ip_port, max_capacity_kg, location_label, sort_order, api_key)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [name, type || 'serial', com_port, baud_rate || 9600, ip_address, ip_port, max_capacity_kg || 60000, location_label, sort_order || 0, apiKey]
    );
    res.status(201).json(wb);
    logAction('weighbridge.created', { weighbridge_id: (wb as any).id, name, crusher_id: req.user!.crusher_id, admin_id: req.user!.id });
  } catch (err) {
    logger.error({ err, crusher_id: req.user!.crusher_id, name }, 'failed to create weighbridge');
    return res.status(500).json({ error: 'Failed to create weighbridge' });
  }
});
