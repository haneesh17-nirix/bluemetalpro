import { Router } from 'express';
import { query, queryOne } from '../config/db';
import { authenticate, authorize, requireCrusher } from '../middleware/auth';
import { logger, logAction } from '../utils/logger';
import { fanOut } from '../services/notifyService';

export const vehiclesRouter = Router();
vehiclesRouter.use(authenticate);
vehiclesRouter.use(requireCrusher);

vehiclesRouter.get('/', async (req, res) => {
  const cid = req.user!.crusher_id!;
  logger.info({ crusher_id: cid }, 'Fetching vehicles list');
  try {
    const rows = await query(`SELECT * FROM vehicles WHERE status != 'retired' AND crusher_id = $1 ORDER BY registration_number`, [cid]);
    res.json(rows);
  } catch (err) {
    logger.error({ err, crusher_id: cid }, 'Failed to fetch vehicles');
    res.status(500).json({ error: 'Failed to fetch vehicles' });
  }
});

vehiclesRouter.post('/', authorize('admin', 'operations'), async (req, res) => {
  const cid = req.user!.crusher_id!;
  const { registration_number, vehicle_type, owner_name, owner_phone, capacity_mt, notes } = req.body;
  try {
    const v = await queryOne(
      `INSERT INTO vehicles (registration_number, vehicle_type, owner_name, owner_phone, capacity_mt, notes, created_by, crusher_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [registration_number.toUpperCase(), vehicle_type, owner_name, owner_phone, capacity_mt, notes, req.user!.id, cid]
    );
    logAction('vehicle.created', { registration_number: registration_number?.toUpperCase(), type: vehicle_type, crusher_id: cid, by: req.user!.email });
    fanOut(cid, {
      type: 'vehicle',
      title: 'Vehicle Added',
      body: `${(v as any).registration_number} (${(v as any).vehicle_type}) registered`,
      reference_id: (v as any).id,
    });
    res.status(201).json(v);
  } catch (err) {
    logger.error({ err, crusher_id: cid, registration_number, by: req.user!.email }, 'Failed to create vehicle');
    res.status(500).json({ error: 'Failed to create vehicle' });
  }
});

vehiclesRouter.put('/:id', authorize('admin', 'operations'), async (req, res) => {
  const cid = req.user!.crusher_id!;
  const { registration_number, vehicle_type, owner_name, owner_phone, capacity_mt, status, notes } = req.body;
  try {
    const v = await queryOne(
      `UPDATE vehicles SET registration_number=$1, vehicle_type=$2, owner_name=$3, owner_phone=$4,
       capacity_mt=$5, status=$6, notes=$7, updated_at=now() WHERE id=$8 AND crusher_id=$9 RETURNING *`,
      [registration_number?.toUpperCase(), vehicle_type, owner_name, owner_phone, capacity_mt, status, notes, req.params.id, cid]
    );
    logAction('vehicle.updated', { vehicleId: req.params.id, crusher_id: cid, registration_number: registration_number?.toUpperCase(), status, by: req.user!.email });
    fanOut(cid, {
      type: 'vehicle',
      title: 'Vehicle Updated',
      body: `${(v as any).registration_number} details updated`,
      reference_id: (v as any).id,
    });
    res.json(v);
  } catch (err) {
    logger.error({ err, crusher_id: cid, vehicleId: req.params.id, by: req.user!.email }, 'Failed to update vehicle');
    res.status(500).json({ error: 'Failed to update vehicle' });
  }
});

vehiclesRouter.get('/:id/trips', async (req, res) => {
  const cid = req.user!.crusher_id!;
  const { from, to } = req.query;
  logger.info({ crusher_id: cid, vehicleId: req.params.id, from, to }, 'Fetching vehicle trips');
  try {
    const rows = await query(
      `SELECT s.invoice_number, s.sale_date, s.party_name, s.grand_total, s.driver_name
       FROM sales s WHERE s.vehicle_id = $1 AND s.crusher_id = $2 AND s.sale_date BETWEEN $3 AND $4 ORDER BY s.sale_date DESC`,
      [req.params.id, cid, from || 'now()-interval 30 days', to || 'now()']
    );
    res.json(rows);
  } catch (err) {
    logger.error({ err, crusher_id: cid, vehicleId: req.params.id, from, to }, 'Failed to fetch vehicle trips');
    res.status(500).json({ error: 'Failed to fetch trips' });
  }
});
