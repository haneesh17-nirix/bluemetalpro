import { Router } from 'express';
import { query, queryOne } from '../config/db';
import { authenticate, authorize } from '../middleware/auth';

export const vehiclesRouter = Router();
vehiclesRouter.use(authenticate);

vehiclesRouter.get('/', async (req, res) => {
  const rows = await query(`SELECT * FROM vehicles WHERE status != 'retired' ORDER BY registration_number`);
  res.json(rows);
});

vehiclesRouter.post('/', authorize('admin', 'sales_operator', 'vehicle_manager'), async (req, res) => {
  const { registration_number, vehicle_type, owner_name, owner_phone, capacity_mt, notes } = req.body;
  const v = await queryOne(
    `INSERT INTO vehicles (registration_number, vehicle_type, owner_name, owner_phone, capacity_mt, notes, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [registration_number.toUpperCase(), vehicle_type, owner_name, owner_phone, capacity_mt, notes, req.user!.id]
  );
  res.status(201).json(v);
});

vehiclesRouter.put('/:id', authorize('admin', 'vehicle_manager'), async (req, res) => {
  const { registration_number, vehicle_type, owner_name, owner_phone, capacity_mt, status, notes } = req.body;
  const v = await queryOne(
    `UPDATE vehicles SET registration_number=$1, vehicle_type=$2, owner_name=$3, owner_phone=$4,
     capacity_mt=$5, status=$6, notes=$7, updated_at=now() WHERE id=$8 RETURNING *`,
    [registration_number?.toUpperCase(), vehicle_type, owner_name, owner_phone, capacity_mt, status, notes, req.params.id]
  );
  res.json(v);
});

vehiclesRouter.get('/:id/trips', async (req, res) => {
  const { from, to } = req.query;
  const rows = await query(
    `SELECT s.invoice_number, s.sale_date, s.party_name, s.grand_total, s.driver_name
     FROM sales s WHERE s.vehicle_id = $1 AND s.sale_date BETWEEN $2 AND $3 ORDER BY s.sale_date DESC`,
    [req.params.id, from || 'now()-interval 30 days', to || 'now()']
  );
  res.json(rows);
});
