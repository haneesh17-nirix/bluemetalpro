import { Router } from 'express';
import { query, queryOne } from '../config/db';
import { authenticate, authorize, requireCrusher } from '../middleware/auth';
import { logger, logAction } from '../utils/logger';

export const vehiclesRouter = Router();
vehiclesRouter.use(authenticate);
vehiclesRouter.use(requireCrusher);

vehiclesRouter.get('/', async (req, res) => {
  const cid = req.user!.crusher_id!;
  const rows = await query(`SELECT * FROM vehicles WHERE status != 'retired' AND crusher_id = $1 ORDER BY registration_number`, [cid]);
  res.json(rows);
});

vehiclesRouter.post('/', authorize('admin', 'sales_operator', 'vehicle_manager'), async (req, res) => {
  const cid = req.user!.crusher_id!;
  const { registration_number, vehicle_type, owner_name, owner_phone, capacity_mt, notes } = req.body;
  const v = await queryOne(
    `INSERT INTO vehicles (registration_number, vehicle_type, owner_name, owner_phone, capacity_mt, notes, created_by, crusher_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [registration_number.toUpperCase(), vehicle_type, owner_name, owner_phone, capacity_mt, notes, req.user!.id, cid]
  );
  logAction('vehicle.created', { number: req.body.vehicle_number, type: req.body.vehicle_type, by: req.user!.email });
  res.status(201).json(v);
});

vehiclesRouter.put('/:id', authorize('admin', 'vehicle_manager'), async (req, res) => {
  const cid = req.user!.crusher_id!;
  const { registration_number, vehicle_type, owner_name, owner_phone, capacity_mt, status, notes } = req.body;
  const v = await queryOne(
    `UPDATE vehicles SET registration_number=$1, vehicle_type=$2, owner_name=$3, owner_phone=$4,
     capacity_mt=$5, status=$6, notes=$7, updated_at=now() WHERE id=$8 AND crusher_id=$9 RETURNING *`,
    [registration_number?.toUpperCase(), vehicle_type, owner_name, owner_phone, capacity_mt, status, notes, req.params.id, cid]
  );
  logAction('vehicle.updated', { vehicleId: req.params.id, by: req.user!.email });
  res.json(v);
});

vehiclesRouter.get('/:id/trips', async (req, res) => {
  const cid = req.user!.crusher_id!;
  const { from, to } = req.query;
  const rows = await query(
    `SELECT s.invoice_number, s.sale_date, s.party_name, s.grand_total, s.driver_name
     FROM sales s WHERE s.vehicle_id = $1 AND s.crusher_id = $2 AND s.sale_date BETWEEN $3 AND $4 ORDER BY s.sale_date DESC`,
    [req.params.id, cid, from || 'now()-interval 30 days', to || 'now()']
  );
  res.json(rows);
});
