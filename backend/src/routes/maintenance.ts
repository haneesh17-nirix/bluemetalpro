import { Router } from 'express';
import { query, queryOne } from '../config/db';
import { authenticate, authorize } from '../middleware/auth';

export const maintenanceRouter = Router();
maintenanceRouter.use(authenticate);

maintenanceRouter.get('/assets', async (req, res) => {
  const { asset_type } = req.query;
  let where = 'WHERE is_active = true';
  const params: any[] = [];
  if (asset_type) { params.push(asset_type); where += ` AND asset_type = $1`; }
  const rows = await query(`SELECT * FROM assets ${where} ORDER BY name`, params);
  res.json(rows);
});

maintenanceRouter.post('/assets', authorize('admin', 'vehicle_manager'), async (req, res) => {
  const { asset_type, name, model, serial_number, purchase_date, purchase_cost, vehicle_id, notes } = req.body;
  const a = await queryOne(
    `INSERT INTO assets (asset_type, name, model, serial_number, purchase_date, purchase_cost, vehicle_id, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [asset_type, name, model, serial_number, purchase_date, purchase_cost, vehicle_id, notes]
  );
  res.status(201).json(a);
});

maintenanceRouter.get('/records', async (req, res) => {
  const { asset_type, status, asset_id } = req.query;
  let where = 'WHERE 1=1';
  const params: any[] = [];
  if (asset_type) { params.push(asset_type); where += ` AND mr.asset_type = $${params.length}`; }
  if (status) { params.push(status); where += ` AND mr.status = $${params.length}`; }
  if (asset_id) { params.push(asset_id); where += ` AND mr.asset_id = $${params.length}`; }
  const rows = await query(
    `SELECT mr.*, a.name as asset_name, a.model FROM maintenance_records mr
     JOIN assets a ON a.id = mr.asset_id ${where} ORDER BY mr.scheduled_date DESC`,
    params
  );
  res.json(rows);
});

maintenanceRouter.post('/records', authorize('admin', 'vehicle_manager'), async (req, res) => {
  const { asset_id, asset_type, title, description, scheduled_date, cost, vendor_name, vendor_phone, parts_replaced, next_service_date } = req.body;
  const r = await queryOne(
    `INSERT INTO maintenance_records (asset_id, asset_type, title, description, scheduled_date, cost, vendor_name, vendor_phone, parts_replaced, next_service_date, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [asset_id, asset_type, title, description, scheduled_date, cost || 0, vendor_name, vendor_phone, parts_replaced, next_service_date, req.user!.id]
  );
  res.status(201).json(r);
});

maintenanceRouter.patch('/records/:id', authorize('admin', 'vehicle_manager'), async (req, res) => {
  const { status, completed_date, cost, parts_replaced, next_service_date } = req.body;
  const r = await queryOne(
    `UPDATE maintenance_records SET status=$1, completed_date=$2, cost=$3, parts_replaced=$4, next_service_date=$5, updated_at=now()
     WHERE id=$6 RETURNING *`,
    [status, completed_date, cost, parts_replaced, next_service_date, req.params.id]
  );
  res.json(r);
});

maintenanceRouter.get('/upcoming', async (req, res) => {
  const rows = await query(
    `SELECT mr.*, a.name as asset_name, a.asset_type FROM maintenance_records mr
     JOIN assets a ON a.id = mr.asset_id
     WHERE mr.status IN ('scheduled', 'in_progress') AND mr.scheduled_date <= CURRENT_DATE + interval '7 days'
     ORDER BY mr.scheduled_date`
  );
  res.json(rows);
});
