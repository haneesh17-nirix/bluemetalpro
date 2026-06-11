import { Router } from 'express';
import { query, queryOne } from '../config/db';
import { authenticate, authorize, requireCrusher } from '../middleware/auth';
import { fanOut } from '../services/notifyService';
import { logger, logAction } from '../utils/logger';

export const maintenanceRouter = Router();
maintenanceRouter.use(authenticate);
maintenanceRouter.use(requireCrusher);

maintenanceRouter.get('/assets', async (req, res) => {
  const cid = req.user!.crusher_id!;
  const { asset_type } = req.query;
  logger.info({ crusher_id: cid, asset_type }, 'Fetching assets');
  let where = 'WHERE is_active = true AND crusher_id = $1';
  const params: any[] = [cid];
  if (asset_type) { params.push(asset_type); where += ` AND asset_type = $${params.length}`; }
  try {
    const rows = await query(`SELECT * FROM assets ${where} ORDER BY name`, params);
    res.json(rows);
  } catch (err) {
    logger.error({ err, crusher_id: cid, asset_type }, 'Failed to fetch assets');
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
});

maintenanceRouter.post('/assets', authorize('admin', 'operations'), async (req, res) => {
  const cid = req.user!.crusher_id!;
  const { asset_type, name, model, serial_number, purchase_date, purchase_cost, vehicle_id, notes } = req.body;
  try {
    const a = await queryOne(
      `INSERT INTO assets (asset_type, name, model, serial_number, purchase_date, purchase_cost, vehicle_id, notes, crusher_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [asset_type, name, model, serial_number, purchase_date, purchase_cost, vehicle_id, notes, cid]
    );
    if (a) {
      logAction('asset.created', { name, type: asset_type, by: req.user!.email, crusher_id: cid });
    }
    res.status(201).json(a);
  } catch (err) {
    logger.error({ err, crusher_id: cid, name, asset_type, by: req.user!.email }, 'Failed to create asset');
    res.status(500).json({ error: 'Failed to create asset' });
  }
});

maintenanceRouter.get('/records', async (req, res) => {
  const cid = req.user!.crusher_id!;
  const { asset_type, status, asset_id } = req.query;
  let where = 'WHERE mr.crusher_id = $1';
  const params: any[] = [cid];
  if (asset_type) { params.push(asset_type); where += ` AND mr.asset_type = $${params.length}`; }
  if (status) { params.push(status); where += ` AND mr.status = $${params.length}`; }
  if (asset_id) { params.push(asset_id); where += ` AND mr.asset_id = $${params.length}`; }
  try {
    const rows = await query(
      `SELECT mr.*, a.name as asset_name, a.model FROM maintenance_records mr
       JOIN assets a ON a.id = mr.asset_id ${where} ORDER BY mr.scheduled_date DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    logger.error({ err, crusher_id: cid, filters: { asset_type, status, asset_id } }, 'Failed to fetch maintenance records');
    res.status(500).json({ error: 'Failed to fetch maintenance records' });
  }
});

maintenanceRouter.post('/records', authorize('admin', 'operations'), async (req, res) => {
  const cid = req.user!.crusher_id!;
  const { asset_id, asset_type, title, description, scheduled_date, cost, vendor_name, vendor_phone, parts_replaced, next_service_date } = req.body;
  try {
    const r = await queryOne(
      `INSERT INTO maintenance_records (asset_id, asset_type, title, description, scheduled_date, cost, vendor_name, vendor_phone, parts_replaced, next_service_date, created_by, crusher_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [asset_id, asset_type, title, description, scheduled_date, cost || 0, vendor_name, vendor_phone, parts_replaced, next_service_date, req.user!.id, cid]
    );
    logAction('maintenance.record_created', { assetId: asset_id, title, scheduledDate: scheduled_date, by: req.user!.email, crusher_id: cid });

    // Real-time SSE fan-out (fire-and-forget)
    fanOut(cid, {
      type: 'maintenance',
      title: `Maintenance Logged — ${title}`,
      body: `${description ?? ''} · ₹${(cost || 0).toLocaleString('en-IN')} · scheduled`,
      reference_id: (r as any)?.id,
    }).catch(() => {});

    res.status(201).json(r);
  } catch (err) {
    logger.error({ err, crusher_id: cid, asset_id, title, by: req.user!.email }, 'Failed to create maintenance record');
    res.status(500).json({ error: 'Failed to create maintenance record' });
  }
});

maintenanceRouter.patch('/records/:id', authorize('admin', 'operations'), async (req, res) => {
  const cid = req.user!.crusher_id!;
  const { status, completed_date, cost, parts_replaced, next_service_date } = req.body;
  try {
    const r = await queryOne(
      `UPDATE maintenance_records SET status=$1, completed_date=$2, cost=$3, parts_replaced=$4, next_service_date=$5, updated_at=now()
       WHERE id=$6 AND crusher_id=$7 RETURNING *`,
      [status, completed_date, cost, parts_replaced, next_service_date, req.params.id, cid]
    );
    if (!r) {
      logger.warn({ crusher_id: cid, recordId: req.params.id, by: req.user!.email }, 'Maintenance record not found or not owned by crusher');
      return res.status(404).json({ error: 'Maintenance record not found' });
    }
    logAction('maintenance.record_updated', { recordId: req.params.id, status, by: req.user!.email, crusher_id: cid });
    res.json(r);
  } catch (err) {
    logger.error({ err, crusher_id: cid, recordId: req.params.id, status, by: req.user!.email }, 'Failed to update maintenance record');
    res.status(500).json({ error: 'Failed to update maintenance record' });
  }
});

maintenanceRouter.get('/upcoming', async (req, res) => {
  const cid = req.user!.crusher_id!;
  logger.info({ crusher_id: cid }, 'Fetching upcoming maintenance (7-day window)');
  try {
    const rows = await query(
      `SELECT mr.*, a.name as asset_name, a.asset_type FROM maintenance_records mr
       JOIN assets a ON a.id = mr.asset_id
       WHERE mr.crusher_id = $1 AND mr.status IN ('scheduled', 'in_progress') AND mr.scheduled_date <= CURRENT_DATE + interval '7 days'
       ORDER BY mr.scheduled_date`,
      [cid]
    );
    res.json(rows);
  } catch (err) {
    logger.error({ err, crusher_id: cid }, 'Failed to fetch upcoming maintenance');
    res.status(500).json({ error: 'Failed to fetch upcoming maintenance' });
  }
});
