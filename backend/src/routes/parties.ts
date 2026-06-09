import { Router } from 'express';
import { query, queryOne } from '../config/db';
import { authenticate, authorize, requireCrusher } from '../middleware/auth';
import { logger, logAction } from '../utils/logger';

export const partiesRouter = Router();
partiesRouter.use(authenticate);
partiesRouter.use(requireCrusher);

partiesRouter.get('/', async (req, res) => {
  const cid = req.user!.crusher_id!;
  const { type, search } = req.query;
  let where = 'WHERE is_active = true AND crusher_id = $1';
  const params: any[] = [cid];
  if (type) { params.push(type); where += ` AND (type = $${params.length} OR type = 'both')`; }
  if (search) { params.push(`%${search}%`); where += ` AND (name ILIKE $${params.length} OR phone ILIKE $${params.length})`; }
  const rows = await query(`SELECT * FROM parties ${where} ORDER BY name`, params);
  res.json(rows);
});

partiesRouter.get('/:id', async (req, res) => {
  const cid = req.user!.crusher_id!;
  const party = await queryOne('SELECT * FROM parties WHERE id = $1 AND crusher_id = $2', [req.params.id, cid]);
  if (!party) return res.status(404).json({ error: 'Not found' });
  res.json(party);
});

partiesRouter.post('/', authorize('admin', 'sales_operator', 'accounts'), async (req, res) => {
  const cid = req.user!.crusher_id!;
  const { name, type, gstin, pan, phone, email, address, city, state, pincode, credit_limit, opening_balance } = req.body;
  const party = await queryOne(
    `INSERT INTO parties (name,type,gstin,pan,phone,email,address,city,state,pincode,credit_limit,opening_balance,created_by,crusher_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
    [name, type || 'customer', gstin, pan, phone, email, address, city, state, pincode, credit_limit || 0, opening_balance || 0, req.user!.id, cid]
  );
  logAction('party.created', { name: req.body.name, type: req.body.party_type, by: req.user!.email });
  res.status(201).json(party);
});

partiesRouter.put('/:id', authorize('admin', 'sales_operator', 'accounts'), async (req, res) => {
  const cid = req.user!.crusher_id!;
  const { name, type, gstin, pan, phone, email, address, city, state, pincode, credit_limit } = req.body;
  const party = await queryOne(
    `UPDATE parties SET name=$1,type=$2,gstin=$3,pan=$4,phone=$5,email=$6,address=$7,city=$8,state=$9,pincode=$10,credit_limit=$11,updated_at=now()
     WHERE id=$12 AND crusher_id=$13 RETURNING *`,
    [name, type, gstin, pan, phone, email, address, city, state, pincode, credit_limit, req.params.id, cid]
  );
  logAction('party.updated', { partyId: req.params.id, by: req.user!.email });
  res.json(party);
});

partiesRouter.delete('/:id', authorize('admin'), async (req, res) => {
  const cid = req.user!.crusher_id!;
  await query('UPDATE parties SET is_active = false WHERE id = $1 AND crusher_id = $2', [req.params.id, cid]);
  res.json({ message: 'Deleted' });
});
